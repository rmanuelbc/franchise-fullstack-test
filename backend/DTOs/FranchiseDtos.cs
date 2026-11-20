using System.ComponentModel.DataAnnotations;

namespace Franchise.Api.DTOs;

public record CreateFranchiseDto(
    [Required(ErrorMessage = "Franchise name is required.")]
    [MinLength(2, ErrorMessage = "Franchise name must be at least 2 characters long.")]
    string Name
);

public record UpdateFranchiseDto(
    [Required(ErrorMessage = "Franchise name is required.")]
    [MinLength(2, ErrorMessage = "Franchise name must be at least 2 characters long.")]
    string Name
);

public record FranchiseResponseDto(int Id, string Name);

public record TopStockProductDto(
    int BranchId,
    string BranchName,
    int ProductId,
    string ProductName,
    int Stock
);
