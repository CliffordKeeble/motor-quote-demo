using System.Text.Json.Serialization;

namespace Fenmoor.Rating;

// The strings on the wire are the contract's (contracts/openapi.yaml), which are the prototype's.
// A C# name cannot always match them, so every member says its own string.

/// <summary>How much cover the customer wants.</summary>
public enum CoverLevel
{
    [JsonStringEnumMemberName("comprehensive")] Comprehensive,
    [JsonStringEnumMemberName("tpft")] ThirdPartyFireAndTheft,
    [JsonStringEnumMemberName("tpo")] ThirdPartyOnly,
}

/// <summary>Where the car is kept overnight.</summary>
public enum Overnight
{
    [JsonStringEnumMemberName("garage")] Garage,
    [JsonStringEnumMemberName("driveway")] Driveway,
    [JsonStringEnumMemberName("street")] Street,
}

/// <summary>Annual mileage, in bands.</summary>
public enum Mileage
{
    [JsonStringEnumMemberName("under5k")] Under5000,
    [JsonStringEnumMemberName("5to10k")] From5000To10000,
    [JsonStringEnumMemberName("10to15k")] From10000To15000,
    [JsonStringEnumMemberName("over15k")] Over15000,
}

/// <summary>What the car is used for.</summary>
public enum CarUse
{
    [JsonStringEnumMemberName("social")] Social,
    [JsonStringEnumMemberName("commuting")] Commuting,
    [JsonStringEnumMemberName("business")] Business,
}

/// <summary>What a line of the working does to the price.</summary>
public enum LineKind
{
    [JsonStringEnumMemberName("base")] Base,
    [JsonStringEnumMemberName("factor")] Factor,
    [JsonStringEnumMemberName("addon")] AddOn,
    [JsonStringEnumMemberName("tax")] Tax,
}

/// <summary>What powers the car.</summary>
public enum Fuel
{
    Petrol,
    Diesel,
    Hybrid,
    Electric,
}
