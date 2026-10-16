using System.Text.RegularExpressions;
using Fenmoor.Rating;

namespace Fenmoor.Api;

/// <summary>
/// Every rule in the browser's validation.ts, again, on the server. The browser's checks are for
/// the person; these are for the server. The messages are the browser's, word for word.
/// </summary>
public static partial class QuoteValidator
{
    public const int FirstStartDateOffsetDays = 0;
    public const int LastStartDateOffsetDays = 30;

    /// <summary>The message for an answer that is missing or is not the kind of value the form sends.</summary>
    public static IReadOnlyDictionary<string, string> UnreadableAnswerMessages { get; } = new Dictionary<string, string>
    {
        ["vehicleId"] = "Choose your car",
        ["carValue"] = "Enter the car’s value in whole pounds, like 12000",
        ["overnight"] = "Choose where the car is kept overnight",
        ["mileage"] = "Choose your annual mileage",
        ["use"] = "Choose what the car is used for",
        ["dateOfBirth"] = "Enter your date of birth",
        ["licenceYears"] = "Enter the number of whole years, like 5",
        ["postcode"] = "Enter a full UK postcode, like PE38 9AB",
        ["noClaimsYears"] = "Enter the number of whole years, like 4",
        ["claimsLast5Years"] = "Choose how many claims you’ve made",
        ["cover"] = "Choose a level of cover",
        ["voluntaryExcess"] = "Choose a voluntary excess",
        ["startDate"] = "Enter the date you want cover to start",
        ["breakdown"] = "Say whether you want breakdown cover",
        ["legalExpenses"] = "Say whether you want legal expenses cover",
    };

    /// <summary>
    /// Checks the answers against <paramref name="today"/> (the London date). One message per
    /// failing field, keyed by the request's property name. Rating is set only when there are none.
    /// <paramref name="unreadable"/> are the answers that were sent but were not a kind of value
    /// the form sends; they are refused with the same message as an answer that is missing.
    /// </summary>
    public static QuoteValidation Validate(QuoteRequest request, DateOnly today, IReadOnlyCollection<string>? unreadable = null)
    {
        ArgumentNullException.ThrowIfNull(request);
        var errors = new Dictionary<string, string>();
        var messages = UnreadableAnswerMessages;

        // Your car
        if (!VehicleCatalogue.TryFind(request.VehicleId, out _))
        {
            errors["vehicleId"] = messages["vehicleId"];
        }

        if (request.CarValue is not { } carValue)
        {
            errors["carValue"] = messages["carValue"];
        }
        else if (carValue is < 500 or > 250000)
        {
            errors["carValue"] = "Enter a value between £500 and £250,000";
        }

        if (request.Overnight is null)
        {
            errors["overnight"] = messages["overnight"];
        }

        if (request.Mileage is null)
        {
            errors["mileage"] = messages["mileage"];
        }

        if (request.Use is null)
        {
            errors["use"] = messages["use"];
        }

        // About you
        int? age = request.DateOfBirth is { } dateOfBirth ? RatingEngine.AgeOn(dateOfBirth, today) : null;
        if (age is not { } years)
        {
            errors["dateOfBirth"] = messages["dateOfBirth"];
        }
        else if (years < 17)
        {
            errors["dateOfBirth"] = "You need to be 17 or over to get a quote";
        }
        else if (years > 99)
        {
            errors["dateOfBirth"] = "Check the year of your date of birth";
        }

        int? licence = request.LicenceYears is >= 0 ? request.LicenceYears : null;
        if (licence is not { } licenceYears)
        {
            errors["licenceYears"] = messages["licenceYears"];
        }
        else if (age is { } ageToday && licenceYears > ageToday - 17)
        {
            errors["licenceYears"] = $"At {ageToday} you can have held a licence for {Math.Max(ageToday - 17, 0)} years at most";
        }

        if (request.Postcode is null || !Postcode().IsMatch(request.Postcode.Trim()))
        {
            errors["postcode"] = messages["postcode"];
        }

        int? noClaims = request.NoClaimsYears is >= 0 ? request.NoClaimsYears : null;
        if (noClaims is not { } noClaimsYears)
        {
            errors["noClaimsYears"] = messages["noClaimsYears"];
        }
        else if (licence is { } held && noClaimsYears > held)
        {
            errors["noClaimsYears"] = "No-claims years can’t be more than the years you’ve held a licence";
        }

        if (request.ClaimsLast5Years is not (0 or 1 or 2))
        {
            errors["claimsLast5Years"] = messages["claimsLast5Years"];
        }

        // Your cover
        if (request.Cover is null)
        {
            errors["cover"] = messages["cover"];
        }

        if (request.VoluntaryExcess is not { } excess || !RatingEngine.VoluntaryExcessOptions.Contains(excess))
        {
            errors["voluntaryExcess"] = messages["voluntaryExcess"];
        }

        if (request.StartDate is not { } startDate)
        {
            errors["startDate"] = messages["startDate"];
        }
        else if (startDate < today.AddDays(FirstStartDateOffsetDays) || startDate > today.AddDays(LastStartDateOffsetDays))
        {
            errors["startDate"] = "Choose a start date from today up to 30 days ahead";
        }

        // The add-ons are the only answers that can be missing without being wrong, so they are the
        // only ones a missing value does not already catch above.
        foreach (var field in unreadable ?? [])
        {
            errors.TryAdd(field, messages[field]);
        }

        if (errors.Count > 0)
        {
            return new QuoteValidation(errors, null);
        }

        return new QuoteValidation(errors, new RatingRequest(
            VehicleId: request.VehicleId!,
            CarValue: request.CarValue!.Value,
            Overnight: request.Overnight!.Value,
            Mileage: request.Mileage!.Value,
            Use: request.Use!.Value,
            DateOfBirth: request.DateOfBirth!.Value,
            LicenceYears: request.LicenceYears!.Value,
            Postcode: request.Postcode!.Trim().ToUpperInvariant(),
            NoClaimsYears: request.NoClaimsYears!.Value,
            ClaimsLast5Years: request.ClaimsLast5Years!.Value,
            Cover: request.Cover!.Value,
            VoluntaryExcess: request.VoluntaryExcess!.Value,
            StartDate: request.StartDate!.Value,
            Breakdown: request.Breakdown ?? false,
            LegalExpenses: request.LegalExpenses ?? false));
    }

    // A full UK postcode: the area and district, an optional space, then the sector and unit.
    [GeneratedRegex(@"^[A-Za-z]{1,2}[0-9][A-Za-z0-9]?\s*[0-9][A-Za-z]{2}\z", RegexOptions.CultureInvariant)]
    private static partial Regex Postcode();
}

/// <summary>The result of checking a request: its errors, or the answers ready to rate.</summary>
public sealed record QuoteValidation(IReadOnlyDictionary<string, string> Errors, RatingRequest? Rating);
