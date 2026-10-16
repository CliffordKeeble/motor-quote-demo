namespace Fenmoor.Rating;

/// <summary>
/// Every answer the engine needs, already checked. The engine never reads a clock, so the start
/// date is an answer like any other.
/// </summary>
public sealed record RatingRequest(
    string VehicleId,
    int CarValue,
    Overnight Overnight,
    Mileage Mileage,
    CarUse Use,
    DateOnly DateOfBirth,
    int LicenceYears,
    string Postcode,
    int NoClaimsYears,
    int ClaimsLast5Years,
    CoverLevel Cover,
    int VoluntaryExcess,
    DateOnly StartDate,
    bool Breakdown,
    bool LegalExpenses);

/// <summary>One row of the working: what was looked at, the answer, and the price so far.</summary>
/// <param name="Multiplier">Set on factor lines only.</param>
/// <param name="Amount">What this line added or took off, to the penny.</param>
public sealed record QuoteLine(
    string Label,
    string Detail,
    LineKind Kind,
    decimal? Multiplier,
    decimal Amount,
    decimal RunningTotal);

/// <summary>The rated price and how it was worked out.</summary>
public sealed record RatedQuote(
    IReadOnlyList<QuoteLine> Lines,
    decimal Annual,
    decimal Monthly,
    int CompulsoryExcess,
    int VoluntaryExcess);
