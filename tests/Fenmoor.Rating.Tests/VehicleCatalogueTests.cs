namespace Fenmoor.Rating.Tests;

// The catalogue's own rules, checked for every car, so that adding or editing a car is checked by
// more than the one API test that pins the list. Each rule is one something else relies on: the
// lookup by id, the contract's group range, the order the form shows, and the engine's pricing.
public class VehicleCatalogueTests
{
    public static TheoryData<string> EveryCarId()
    {
        var ids = new TheoryData<string>();
        foreach (var vehicle in VehicleCatalogue.All)
        {
            ids.Add(vehicle.Id);
        }

        return ids;
    }

    [Fact]
    public void Every_id_is_unique_and_finds_its_own_car()
    {
        var ids = VehicleCatalogue.All.Select(v => v.Id).ToList();

        Assert.Equal(ids.Count, ids.Distinct(StringComparer.Ordinal).Count());
        Assert.All(VehicleCatalogue.All, v =>
        {
            Assert.True(VehicleCatalogue.TryFind(v.Id, out var found));
            Assert.Same(v, found);
        });
    }

    [Fact]
    public void Every_car_has_a_make_and_a_model_to_show()
    {
        Assert.All(VehicleCatalogue.All, v =>
        {
            Assert.False(string.IsNullOrWhiteSpace(v.Make), $"{v.Id} has no make");
            Assert.False(string.IsNullOrWhiteSpace(v.Model), $"{v.Id} has no model");
        });
    }

    // contracts/openapi.yaml, Vehicle.group: minimum 1, maximum 50.
    [Fact]
    public void Every_group_is_within_the_contracts_1_to_50()
    {
        Assert.All(VehicleCatalogue.All, v => Assert.InRange(v.Group, 1, 50));
    }

    // The catalogue's summary says the form shows the cars by insurance group, so a car added out
    // of place goes red here rather than appearing out of order in the dropdown.
    [Fact]
    public void The_cars_are_in_insurance_group_order()
    {
        var groups = VehicleCatalogue.All.Select(v => v.Group).ToList();

        Assert.Equal(groups.Order().ToList(), groups);
    }

    [Theory]
    [MemberData(nameof(EveryCarId))]
    public void Every_car_can_be_priced(string vehicleId)
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample with { VehicleId = vehicleId });

        Assert.True(VehicleCatalogue.TryFind(vehicleId, out var vehicle));
        Assert.Equal($"Insurance group {vehicle.Group}", quote.Line("Your car").Detail);
        Assert.True(quote.Annual > 0m, $"{vehicleId} priced at {quote.Annual}");
    }
}
