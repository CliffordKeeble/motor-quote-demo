using System.Text.Json;
using System.Text.Json.Nodes;

namespace Fenmoor.Api;

/// <summary>
/// What was read from a request body. <see cref="Request"/> is null when the body is not a JSON
/// object. <see cref="Unreadable"/> names the answers that were there but were not the kind of
/// value the form sends (text for a number, a string no enum has, a date that is not a date).
/// </summary>
public sealed record QuoteRead(QuoteRequest? Request, IReadOnlyList<string> Unreadable);

/// <summary>
/// Reads the body one answer at a time, so that one answer of the wrong kind does not hide the
/// others: every failing field is named in the 400, not only the first the JSON reader tripped on.
/// </summary>
public static class QuoteRequestReader
{
    private static readonly JsonNodeOptions NodeOptions = new() { PropertyNameCaseInsensitive = true };

    public static async Task<QuoteRead> ReadAsync(Stream body, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        JsonNode? root;
        try
        {
            root = await JsonNode.ParseAsync(body, NodeOptions, cancellationToken: cancellationToken);
        }
        catch (JsonException)
        {
            return new QuoteRead(null, []);
        }

        if (root is not JsonObject answers)
        {
            return new QuoteRead(null, []);
        }

        var unreadable = new List<string>();

        T? Get<T>(string name)
        {
            if (!answers.TryGetPropertyValue(name, out var node) || node is null)
            {
                return default;
            }

            try
            {
                return node.Deserialize<T>(ApiJson.Options);
            }
            catch (JsonException)
            {
                unreadable.Add(name);
                return default;
            }
        }

        var request = new QuoteRequest(
            Get<string>("vehicleId"),
            Get<int?>("carValue"),
            Get<Fenmoor.Rating.Overnight?>("overnight"),
            Get<Fenmoor.Rating.Mileage?>("mileage"),
            Get<Fenmoor.Rating.CarUse?>("use"),
            Get<DateOnly?>("dateOfBirth"),
            Get<int?>("licenceYears"),
            Get<string>("postcode"),
            Get<int?>("noClaimsYears"),
            Get<int?>("claimsLast5Years"),
            Get<Fenmoor.Rating.CoverLevel?>("cover"),
            Get<int?>("voluntaryExcess"),
            Get<DateOnly?>("startDate"),
            Get<bool?>("breakdown"),
            Get<bool?>("legalExpenses"));

        return new QuoteRead(request, unreadable);
    }
}
