using Fenmoor.Rating;

namespace Fenmoor.Api;

/// <summary>
/// The body of POST /api/quote, as contracts/openapi.yaml describes it. Every answer can be
/// missing here, so that a missing answer is a 400 with the browser's message and not a crash.
/// The two add-ons are optional: left out, they mean no.
/// </summary>
public sealed record QuoteRequest(
    string? VehicleId,
    int? CarValue,
    Overnight? Overnight,
    Mileage? Mileage,
    CarUse? Use,
    DateOnly? DateOfBirth,
    int? LicenceYears,
    string? Postcode,
    int? NoClaimsYears,
    int? ClaimsLast5Years,
    CoverLevel? Cover,
    int? VoluntaryExcess,
    DateOnly? StartDate,
    bool? Breakdown,
    bool? LegalExpenses);

/// <summary>The 200 response of POST /api/quote.</summary>
public sealed record QuoteResponse(
    string Reference,
    DateOnly ValidUntil,
    IReadOnlyList<QuoteLine> Lines,
    decimal Annual,
    decimal Monthly,
    int CompulsoryExcess,
    int VoluntaryExcess);
