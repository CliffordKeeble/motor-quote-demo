using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;

namespace Fenmoor.Api;

/// <summary>How the API reads and writes JSON. One set of options, used by the host and by the tests.</summary>
public static class ApiJson
{
    /// <summary>The options for reading a request body.</summary>
    public static JsonSerializerOptions Options { get; } = Configure(new JsonSerializerOptions(JsonSerializerDefaults.Web));

    /// <summary>
    /// camelCase names; enums as the contract's strings and never as numbers; no nulls written.
    /// The body is indented with LF line ends, so the golden example in contracts/examples reads
    /// as a document and is the same bytes on every machine. Pounds and curly apostrophes are
    /// written as themselves, not as \u escapes.
    /// </summary>
    public static JsonSerializerOptions Configure(JsonSerializerOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.WriteIndented = true;
        options.NewLine = "\n";
        options.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
        options.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
        return options;
    }
}
