using System.Collections.Frozen;
using System.Globalization;

namespace Fenmoor.Rating;

/// <summary>
/// The rating engine: answers in, an itemised price out. Pure: <see cref="decimal"/> for money,
/// <see cref="DateOnly"/> for dates, no I/O, no logging, no clock.
/// </summary>
/// <remarks>
/// Every price in this demo is invented. Only the Insurance Premium Tax rate is real.
/// The order of the lines is the order of the factors below, and every line is rounded to the
/// penny, half away from zero, so the lines add up exactly.
/// </remarks>
public static class RatingEngine
{
    /// <summary>
    /// Insurance Premium Tax, standard rate: 12% since 1 June 2017.
    /// Source: gov.uk, "Historical Insurance Premium Tax rates", read 16 October 2026.
    /// </summary>
    public const decimal InsurancePremiumTaxRate = 0.12m;

    /// <summary>The charge for paying monthly. Illustrative.</summary>
    public const decimal MonthlyCreditCharge = 0.08m;

    private const decimal BreakdownCoverPrice = 45m;
    private const decimal LegalExpensesCoverPrice = 25m;

    private static readonly CultureInfo British = CultureInfo.GetCultureInfo("en-GB");

    // Index = whole years of no-claims bonus, capped at 9.
    private static readonly decimal[] NoClaimsDiscount = [0m, 0.15m, 0.25m, 0.35m, 0.42m, 0.48m, 0.52m, 0.56m, 0.60m, 0.65m];

    private static readonly FrozenDictionary<int, decimal> VoluntaryExcessFactors = new Dictionary<int, decimal>
    {
        [0] = 1.0m,
        [100] = 0.97m,
        [250] = 0.93m,
        [500] = 0.88m,
    }.ToFrozenDictionary();

    // INVENTED. Area bands by postcode area, the letters at the start of the postcode.
    private static readonly AreaBand[] AreaBands =
    [
        new("A", 0.85m, ["PE", "NR", "IP", "TR", "LD", "HR", "DG", "IV"]),
        new("C", 1.25m, ["B", "M", "L", "LS", "BD", "G", "NE"]),
        new("D", 1.60m, ["E", "N", "NW", "SE", "SW", "W", "WC", "EC"]),
    ];

    private static readonly AreaBand MiddleBand = new("B", 1.0m, []);

    /// <summary>The voluntary excesses the form offers: the ones the engine has a factor for.</summary>
    public static IReadOnlyCollection<int> VoluntaryExcessOptions { get; } = [.. VoluntaryExcessFactors.Keys.Order()];

    /// <summary>Rates the answers and returns the price with every step of the working.</summary>
    public static RatedQuote Rate(RatingRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!VehicleCatalogue.TryFind(request.VehicleId, out var vehicle))
        {
            throw new ArgumentException($"Unknown vehicle '{request.VehicleId}'.", nameof(request));
        }

        var age = AgeOn(request.DateOfBirth, request.StartDate);
        var area = AreaBandFor(request.Postcode);
        var sheet = new Worksheet(StartingPrice(request.Cover), CoverName(request.Cover));

        sheet.Factor("Your age", $"{age} on the start date", AgeFactor(age));
        sheet.Factor("Driving experience", $"{Years(request.LicenceYears)} with a full licence", ExperienceFactor(request.LicenceYears));
        sheet.Factor("Your car", $"Insurance group {vehicle.Group}", GroupFactor(vehicle.Group));
        if (request.Cover != CoverLevel.ThirdPartyOnly)
        {
            sheet.Factor("Car value", Pounds(request.CarValue), ValueFactor(request.CarValue));
        }

        sheet.Factor("Where you live", $"{PostcodeArea(request.Postcode)} postcode area, band {area.Band}", area.Factor);
        sheet.Factor("Where it is kept overnight", OvernightName(request.Overnight), OvernightFactor(request.Overnight));
        sheet.Factor("Annual mileage", MileageName(request.Mileage), MileageFactor(request.Mileage));
        sheet.Factor("What the car is used for", UseName(request.Use), UseFactor(request.Use));
        sheet.Factor("Claims in the last 5 years", request.ClaimsLast5Years.ToString(British), ClaimsFactor(request.ClaimsLast5Years));

        var discount = NoClaimsDiscountFor(request.NoClaimsYears);
        var percentOff = decimal.ToInt32(discount * 100m);
        sheet.Factor("No-claims bonus", $"{Years(request.NoClaimsYears)}, {percentOff}% off", 1m - discount);
        sheet.Factor("Voluntary excess", Pounds(request.VoluntaryExcess), VoluntaryExcessFactor(request.VoluntaryExcess));

        if (request.Breakdown)
        {
            sheet.AddOn("Breakdown cover", BreakdownCoverPrice);
        }

        if (request.LegalExpenses)
        {
            sheet.AddOn("Legal expenses cover", LegalExpensesCoverPrice);
        }

        sheet.Tax("Insurance Premium Tax", "12% on everything above", InsurancePremiumTaxRate);

        return new RatedQuote(
            sheet.Lines,
            sheet.Total,
            Money.Round(sheet.Total * (1m + MonthlyCreditCharge) / 12m),
            CompulsoryExcess(age),
            request.VoluntaryExcess);
    }

    /// <summary>
    /// Whole years old on a given day. A birthday on that day counts: you are the new age
    /// from the start of it.
    /// </summary>
    public static int AgeOn(DateOnly dateOfBirth, DateOnly on)
    {
        var age = on.Year - dateOfBirth.Year;
        var beforeBirthday = on.Month < dateOfBirth.Month || (on.Month == dateOfBirth.Month && on.Day < dateOfBirth.Day);
        return beforeBirthday ? age - 1 : age;
    }

    /// <summary>The letters at the start of a postcode: <c>PE</c> from <c>pe38 9ab</c>.</summary>
    public static string PostcodeArea(string postcode)
    {
        ArgumentNullException.ThrowIfNull(postcode);
        var text = postcode.Trim().ToUpperInvariant();
        var letters = 0;
        while (letters < 2 && letters < text.Length && text[letters] is >= 'A' and <= 'Z')
        {
            letters++;
        }

        return text[..letters];
    }

    // The starting price, by level of cover. Third party only is dearer: that is real market behaviour.
    private static decimal StartingPrice(CoverLevel cover) => cover switch
    {
        CoverLevel.Comprehensive => 400m,
        CoverLevel.ThirdPartyFireAndTheft => 430m,
        CoverLevel.ThirdPartyOnly => 460m,
        _ => throw new ArgumentOutOfRangeException(nameof(cover), cover, null),
    };

    private static string CoverName(CoverLevel cover) => cover switch
    {
        CoverLevel.Comprehensive => "Comprehensive",
        CoverLevel.ThirdPartyFireAndTheft => "Third party, fire and theft",
        CoverLevel.ThirdPartyOnly => "Third party only",
        _ => throw new ArgumentOutOfRangeException(nameof(cover), cover, null),
    };

    private static decimal AgeFactor(int age) => age switch
    {
        < 21 => 2.6m,
        < 25 => 1.8m,
        < 30 => 1.25m,
        < 50 => 1.0m,
        < 70 => 0.9m,
        _ => 1.15m,
    };

    private static decimal ExperienceFactor(int licenceYears) => licenceYears switch
    {
        < 1 => 1.4m,
        < 3 => 1.2m,
        < 5 => 1.05m,
        _ => 1.0m,
    };

    private static decimal GroupFactor(int group) => 0.7m + (group / 50m);

    private static decimal ValueFactor(int carValue) => carValue switch
    {
        < 5000 => 0.95m,
        < 15000 => 1.0m,
        < 30000 => 1.1m,
        _ => 1.2m,
    };

    private static AreaBand AreaBandFor(string postcode)
    {
        var area = PostcodeArea(postcode);
        return AreaBands.FirstOrDefault(band => band.Areas.Contains(area)) ?? MiddleBand;
    }

    private static decimal OvernightFactor(Overnight overnight) => overnight switch
    {
        Overnight.Garage => 0.95m,
        Overnight.Driveway => 1.0m,
        Overnight.Street => 1.1m,
        _ => throw new ArgumentOutOfRangeException(nameof(overnight), overnight, null),
    };

    private static string OvernightName(Overnight overnight) => overnight switch
    {
        Overnight.Garage => "Garage",
        Overnight.Driveway => "Driveway",
        Overnight.Street => "On the street",
        _ => throw new ArgumentOutOfRangeException(nameof(overnight), overnight, null),
    };

    private static decimal MileageFactor(Mileage mileage) => mileage switch
    {
        Mileage.Under5000 => 0.9m,
        Mileage.From5000To10000 => 1.0m,
        Mileage.From10000To15000 => 1.1m,
        Mileage.Over15000 => 1.2m,
        _ => throw new ArgumentOutOfRangeException(nameof(mileage), mileage, null),
    };

    private static string MileageName(Mileage mileage) => mileage switch
    {
        Mileage.Under5000 => "Under 5,000 miles",
        Mileage.From5000To10000 => "5,000 to 10,000 miles",
        Mileage.From10000To15000 => "10,000 to 15,000 miles",
        Mileage.Over15000 => "Over 15,000 miles",
        _ => throw new ArgumentOutOfRangeException(nameof(mileage), mileage, null),
    };

    private static decimal UseFactor(CarUse use) => use switch
    {
        CarUse.Social => 0.95m,
        CarUse.Commuting => 1.0m,
        CarUse.Business => 1.15m,
        _ => throw new ArgumentOutOfRangeException(nameof(use), use, null),
    };

    private static string UseName(CarUse use) => use switch
    {
        CarUse.Social => "Social only",
        CarUse.Commuting => "Social and commuting",
        CarUse.Business => "Business",
        _ => throw new ArgumentOutOfRangeException(nameof(use), use, null),
    };

    private static decimal ClaimsFactor(int claims) => claims switch
    {
        0 => 1.0m,
        1 => 1.25m,
        _ => 1.6m,
    };

    private static decimal NoClaimsDiscountFor(int years) => NoClaimsDiscount[Math.Min(years, NoClaimsDiscount.Length - 1)];

    // An excess the form does not offer changes nothing. The API refuses it before it gets here.
    private static decimal VoluntaryExcessFactor(int excess) => VoluntaryExcessFactors.GetValueOrDefault(excess, 1.0m);

    // £500 compulsory excess for drivers under 25, £250 for the rest.
    private static int CompulsoryExcess(int age) => age < 25 ? 500 : 250;

    private static string Pounds(int amount) => "£" + amount.ToString("N0", British);

    // "1 year", "6 years".
    private static string Years(int count) => count == 1 ? "1 year" : count.ToString(British) + " years";

    private sealed record AreaBand(string Band, decimal Factor, string[] Areas);

    /// <summary>The working, line by line. Each line is rounded to the penny as it is made.</summary>
    private sealed class Worksheet
    {
        private readonly List<QuoteLine> _lines = [];

        public Worksheet(decimal startingPrice, string detail)
        {
            Total = Money.Round(startingPrice);
            _lines.Add(new QuoteLine("Starting price", detail, LineKind.Base, null, Total, Total));
        }

        public decimal Total { get; private set; }

        public IReadOnlyList<QuoteLine> Lines => _lines;

        public void Factor(string label, string detail, decimal multiplier)
        {
            var next = Money.Round(Total * multiplier);
            _lines.Add(new QuoteLine(label, detail, LineKind.Factor, multiplier, Money.Round(next - Total), next));
            Total = next;
        }

        public void AddOn(string label, decimal price)
        {
            Total = Money.Round(Total + price);
            _lines.Add(new QuoteLine(label, "Added cover", LineKind.AddOn, null, Money.Round(price), Total));
        }

        public void Tax(string label, string detail, decimal rate)
        {
            var tax = Money.Round(Total * rate);
            Total = Money.Round(Total + tax);
            _lines.Add(new QuoteLine(label, detail, LineKind.Tax, null, tax, Total));
        }
    }
}
