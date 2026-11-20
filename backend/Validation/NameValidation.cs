namespace Franchise.Api.Validation;

public static class NameValidation
{
    public static bool IsValid(string? value) =>
        value is not null && value.Trim().Length >= 2;
}
