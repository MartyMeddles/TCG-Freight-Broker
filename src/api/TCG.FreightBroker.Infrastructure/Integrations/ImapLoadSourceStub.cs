using Microsoft.Extensions.Logging;
using TCG.FreightBroker.Application.Integrations;

namespace TCG.FreightBroker.Infrastructure.Integrations;

/// <summary>
/// Stub implementation of <see cref="IImapLoadSourceService"/> that generates
/// synthetic load-notification "emails" without connecting to a real mailbox.
/// Replace with an IMAP client (e.g. MailKit) backed by real credentials when ready.
/// </summary>
public sealed partial class ImapLoadSourceStub : IImapLoadSourceService
{
    private readonly ILogger<ImapLoadSourceStub> _logger;
    private static readonly Random _rng = new();

    [LoggerMessage(Level = LogLevel.Debug,
        Message = "[IMAP-STUB] Fetched message {MessageId} from {Sender}: {Origin} → {Destination}")]
    private static partial void LogFetch(ILogger logger, string messageId, string sender, string origin, string destination);

    private static readonly string[] Origins = [
        "Chicago, IL", "Dallas, TX", "Houston, TX", "Atlanta, GA",
        "Newark, NJ", "Los Angeles, CA", "Seattle, WA", "Denver, CO",
    ];

    private static readonly string[] Destinations = [
        "Memphis, TN", "Columbus, OH", "Charlotte, NC", "Phoenix, AZ",
        "Nashville, TN", "Kansas City, MO", "Indianapolis, IN", "Louisville, KY",
    ];

    private static readonly string[] Equipment = ["Van", "Reefer", "Flatbed", "Step Deck"];

    private static readonly string[] Senders = [
        "loadteam@spotfreight.example.com",
        "ops@quickcarrier.example.com",
        "dispatch@lanepartner.example.com",
    ];

    public ImapLoadSourceStub(ILogger<ImapLoadSourceStub> logger) => _logger = logger;

    public Task<IReadOnlyList<ImapLoadMessage>> FetchPendingAsync(
        CancellationToken cancellationToken = default)
    {
        // Simulate 0-2 inbound emails per poll cycle.
        int count = _rng.Next(0, 3);

        var messages = new List<ImapLoadMessage>(count);
        for (int i = 0; i < count; i++)
        {
            string origin = Origins[_rng.Next(Origins.Length)];
            string destination = Destinations[_rng.Next(Destinations.Length)];
            string equipment = Equipment[_rng.Next(Equipment.Length)];
            decimal rate = Math.Round((decimal)(_rng.Next(1_800, 3_600)), 2);
            DateTimeOffset pickupDate = DateTimeOffset.UtcNow.AddDays(_rng.Next(1, 6));
            string sender = Senders[_rng.Next(Senders.Length)];
            string msgId = $"<{Guid.NewGuid():N}@stub.local>";

            var msg = new ImapLoadMessage(
                MessageId: msgId,
                Subject: $"Load Opportunity: {origin} → {destination} | {equipment} | ${rate:N0}",
                Origin: origin,
                Destination: destination,
                EquipmentType: equipment,
                TargetRate: rate,
                PickupDate: pickupDate,
                ReceivedAt: DateTimeOffset.UtcNow.AddSeconds(-_rng.Next(30, 300)));

            LogFetch(_logger, msgId, sender, origin, destination);

            messages.Add(msg);
        }

        return Task.FromResult<IReadOnlyList<ImapLoadMessage>>(messages);
    }
}
