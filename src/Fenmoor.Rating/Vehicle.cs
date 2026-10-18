using System.Collections.Frozen;

namespace Fenmoor.Rating;

/// <summary>A sample car the quote form offers.</summary>
/// <param name="Id">The id the quote request names.</param>
/// <param name="Group">Insurance group, 1 to 50. Invented, see <see cref="VehicleCatalogue"/>.</param>
public sealed record Vehicle(string Id, string Make, string Model, int Year, Fuel Fuel, int Group);

/// <summary>The sample cars, in the order the form shows them: by insurance group.</summary>
public static class VehicleCatalogue
{
    // INVENTED. The cars are real models; the insurance groups are made up for this demo and are
    // not the published ratings.
    public static IReadOnlyList<Vehicle> All { get; } =
    [
        new("ford-fiesta-2019", "Ford", "Fiesta 1.0 EcoBoost Titanium", 2019, Fuel.Petrol, 12),
        new("toyota-yaris-2022", "Toyota", "Yaris 1.5 Hybrid Design", 2022, Fuel.Hybrid, 13),
        new("vw-golf-2021", "Volkswagen", "Golf 1.5 TSI Life", 2021, Fuel.Petrol, 17),
        new("alfa-giulietta-2010", "Alfa Romeo", "Giulietta 1.6 JTDM-2", 2010, Fuel.Diesel, 19),
        new("nissan-leaf-2020", "Nissan", "Leaf 40kWh Acenta", 2020, Fuel.Electric, 21),
        new("bmw-320d-2020", "BMW", "320d M Sport", 2020, Fuel.Diesel, 30),
        new("tesla-model3-2023", "Tesla", "Model 3 Long Range", 2023, Fuel.Electric, 48),
    ];

    private static readonly FrozenDictionary<string, Vehicle> ById = All.ToFrozenDictionary(v => v.Id, StringComparer.Ordinal);

    /// <summary>Finds a car by its id, or returns false.</summary>
    public static bool TryFind(string? id, out Vehicle vehicle)
    {
        vehicle = null!;
        return id is not null && ById.TryGetValue(id, out vehicle!);
    }
}
