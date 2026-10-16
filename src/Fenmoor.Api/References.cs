using System.Security.Cryptography;

namespace Fenmoor.Api;

/// <summary>Makes the reference printed on a quote.</summary>
public interface IReferenceGenerator
{
    /// <summary><c>FM-</c> and six characters, like <c>FM-7K2Q9D</c>.</summary>
    string NewReference();
}

public sealed class RandomReferenceGenerator : IReferenceGenerator
{
    private const string Characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public string NewReference() => "FM-" + RandomNumberGenerator.GetString(Characters, 6);
}
