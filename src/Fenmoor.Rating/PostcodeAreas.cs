using System.Collections.Frozen;

namespace Fenmoor.Rating;

/// <summary>
/// The UK's geographic postcode areas: the letters at the start of a postcode, <c>PE</c> from
/// <c>PE38 9AB</c>.
/// </summary>
public static class PostcodeAreas
{
    /// <summary>
    /// The 121 geographic postcode areas in the main table of Wikipedia, "List of postcode areas in
    /// the United Kingdom" (https://en.wikipedia.org/wiki/List_of_postcode_areas_in_the_United_Kingdom),
    /// read 31 October 2026. The page says "There are currently 121 geographic postcode areas in use
    /// in the UK and a further three often combined with these covering the Crown Dependencies of
    /// Guernsey, Jersey and Isle of Man". Those three (GY, JE, IM) are in a separate table and are
    /// not here, and neither are the non-geographic codes (BF, BX and the rest).
    /// </summary>
    public static IReadOnlySet<string> Uk { get; } = new[]
    {
        "AB", "AL", "B", "BA", "BB", "BD", "BH", "BL", "BN", "BR", "BS", "BT",
        "CA", "CB", "CF", "CH", "CM", "CO", "CR", "CT", "CV", "CW",
        "DA", "DD", "DE", "DG", "DH", "DL", "DN", "DT", "DY",
        "E", "EC", "EH", "EN", "EX",
        "FK", "FY",
        "G", "GL", "GU",
        "HA", "HD", "HG", "HP", "HR", "HS", "HU", "HX",
        "IG", "IP", "IV",
        "KA", "KT", "KW", "KY",
        "L", "LA", "LD", "LE", "LL", "LN", "LS", "LU",
        "M", "ME", "MK", "ML",
        "N", "NE", "NG", "NN", "NP", "NR", "NW",
        "OL", "OX",
        "PA", "PE", "PH", "PL", "PO", "PR",
        "RG", "RH", "RM",
        "S", "SA", "SE", "SG", "SK", "SL", "SM", "SN", "SO", "SP", "SR", "SS", "ST", "SW", "SY",
        "TA", "TD", "TF", "TN", "TQ", "TR", "TS", "TW",
        "UB",
        "W", "WA", "WC", "WD", "WF", "WN", "WR", "WS", "WV",
        "YO",
        "ZE",
    }.ToFrozenSet(StringComparer.Ordinal);

    /// <summary>Whether <paramref name="area"/> (upper case, like <c>PE</c>) is one of the UK's postcode areas.</summary>
    public static bool IsUk(string area) => Uk.Contains(area);
}
