namespace TCG.FreightBroker.Application.Integrations;

/// <summary>
/// A load opportunity extracted from an inbound load-notification email.
/// </summary>
/// <param name="MessageId">Unique message identifier from the mail server.</param>
/// <param name="Subject">Raw email subject line.</param>
/// <param name="Origin">Parsed origin city/state.</param>
/// <param name="Destination">Parsed destination city/state.</param>
/// <param name="EquipmentType">Equipment type (e.g. Van, Reefer, Flatbed).</param>
/// <param name="TargetRate">Rate quoted in the email, or null if not parseable.</param>
/// <param name="PickupDate">Pickup date parsed from the email body.</param>
/// <param name="ReceivedAt">UTC timestamp the email arrived in the mailbox.</param>
public record ImapLoadMessage(
    string MessageId,
    string Subject,
    string Origin,
    string Destination,
    string EquipmentType,
    decimal? TargetRate,
    DateTimeOffset PickupDate,
    DateTimeOffset ReceivedAt);

/// <summary>
/// Polls a mailbox via IMAP for inbound load-notification emails and parses
/// them into <see cref="ImapLoadMessage"/> records ready for the pipeline.
/// </summary>
public interface IImapLoadSourceService
{
    /// <summary>
    /// Fetches all unread load-notification messages from the configured mailbox.
    /// Each call should mark fetched messages as read / move them to a processed folder.
    /// </summary>
    Task<IReadOnlyList<ImapLoadMessage>> FetchPendingAsync(
        CancellationToken cancellationToken = default);
}
