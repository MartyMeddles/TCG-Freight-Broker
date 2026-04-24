using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class ImportController : ControllerBase
{
    private readonly AppDbContext _db;

    public ImportController(AppDbContext db) => _db = db;

    // ─── GET /api/import/template ──────────────────────────────────────────
    [HttpGet("template")]
    public IActionResult DownloadTemplate()
    {
        var csv = new StringBuilder();
        csv.AppendLine("BillTo,ClientRef,OriginCity,OriginState,DestinationCity,DestinationState,CarrierRate");
        csv.AppendLine("Performance Food Group,PFG,Chicago,IL,Dallas,TX,2100.00");
        csv.AppendLine("Sysco Corporation,SYS,Memphis,TN,Atlanta,GA,1800.00");

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", "client-lane-import-template.csv");
    }

    // ─── POST /api/import/clients-lanes ───────────────────────────────────
    [HttpPost("clients-lanes")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5 MB max
    public async Task<ActionResult<ApiResult<ImportResult>>> ImportClientsLanes(
        IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResult<ImportResult>.Fail("No file uploaded."));

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResult<ImportResult>.Fail("Only .csv files are accepted."));

        var result = new ImportResult();

        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
        var header = await reader.ReadLineAsync(cancellationToken); // skip header row

        if (header is null)
            return BadRequest(ApiResult<ImportResult>.Fail("File is empty."));

        // Validate header columns
        var cols = header.Split(',');
        if (cols.Length < 7
            || !cols[0].Trim().Equals("BillTo", StringComparison.OrdinalIgnoreCase)
            || !cols[1].Trim().Equals("ClientRef", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResult<ImportResult>.Fail(
                "Invalid template. Expected columns: BillTo, ClientRef, OriginCity, OriginState, DestinationCity, DestinationState, CarrierRate"));
        }

        var lineNumber = 1;
        string? line;
        while ((line = await reader.ReadLineAsync(cancellationToken)) is not null)
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = ParseCsvLine(line);
            if (parts.Length < 7)
            {
                result.Errors.Add($"Row {lineNumber}: expected 7 columns, got {parts.Length}. Skipped.");
                continue;
            }

            var billTo       = parts[0].Trim();
            var clientRef    = parts[1].Trim();
            var originCity   = parts[2].Trim();
            var originState  = parts[3].Trim();
            var destCity     = parts[4].Trim();
            var destState    = parts[5].Trim();
            var rateStr      = parts[6].Trim();

            if (string.IsNullOrEmpty(billTo) || string.IsNullOrEmpty(originCity) || string.IsNullOrEmpty(destCity))
            {
                result.Errors.Add($"Row {lineNumber}: BillTo, OriginCity, and DestinationCity are required. Skipped.");
                continue;
            }

            if (!decimal.TryParse(rateStr, out var carrierRate) || carrierRate < 0)
            {
                result.Errors.Add($"Row {lineNumber}: CarrierRate '{rateStr}' is not a valid number. Skipped.");
                continue;
            }

            // Find or create client
            var client = await _db.Clients
                .FirstOrDefaultAsync(c => c.Name == billTo, cancellationToken);

            if (client is null)
            {
                client = new Client { Name = billTo, IsActive = true };
                _db.Clients.Add(client);
                await _db.SaveChangesAsync(cancellationToken); // flush to get Id
                result.ClientsCreated++;
            }
            else
            {
                result.ClientsMatched++;
            }

            // Check for duplicate lane
            var laneExists = await _db.Lanes.AnyAsync(l =>
                l.ClientId == client.Id &&
                l.OriginCity == originCity && l.OriginState == originState &&
                l.DestinationCity == destCity && l.DestinationState == destState,
                cancellationToken);

            if (laneExists)
            {
                result.LanesDuplicated++;
                result.Errors.Add($"Row {lineNumber}: Lane {originCity}, {originState} → {destCity}, {destState} for '{billTo}' already exists. Skipped.");
                continue;
            }

            var lane = new Lane
            {
                ClientId        = client.Id,
                OriginCity      = originCity,
                OriginState     = originState,
                DestinationCity = destCity,
                DestinationState = destState,
                Mode            = "TL",
                IsActive        = true,
            };
            _db.Lanes.Add(lane);
            result.LanesCreated++;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(ApiResult<ImportResult>.Ok(result));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    /// <summary>Parses a single CSV line, handling quoted fields.</summary>
    private static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var sb = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                { sb.Append('"'); i++; }
                else
                { inQuotes = !inQuotes; }
            }
            else if (c == ',' && !inQuotes)
            { fields.Add(sb.ToString()); sb.Clear(); }
            else
            { sb.Append(c); }
        }
        fields.Add(sb.ToString());
        return [.. fields];
    }
}

public class ImportResult
{
    public int ClientsCreated    { get; set; }
    public int ClientsMatched    { get; set; }
    public int LanesCreated      { get; set; }
    public int LanesDuplicated   { get; set; }
    public List<string> Errors   { get; set; } = [];
}
