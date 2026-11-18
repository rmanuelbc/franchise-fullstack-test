using Franchise.Api.Data;
using Franchise.Api.DTOs;
using Franchise.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Franchise.Api.Controllers;

[ApiController]
[Route("api")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/branches/{branchId}/products
    [HttpGet("branches/{branchId}/products")]
    public async Task<ActionResult<IEnumerable<ProductResponseDto>>> GetByBranch(int branchId)
    {
        var branchExists = await _context.Branches.AnyAsync(b => b.Id == branchId);
        if (!branchExists)
            return NotFound(new { message = $"Branch with ID {branchId} was not found." });

        var products = await _context.Products
            .Where(p => p.BranchId == branchId)
            .Select(p => new ProductResponseDto(p.Id, p.BranchId, p.Name, p.Stock))
            .ToListAsync();

        return Ok(products);
    }

    // POST: api/branches/{branchId}/products
    [HttpPost("branches/{branchId}/products")]
    public async Task<ActionResult<ProductResponseDto>> Create(int branchId, [FromBody] CreateProductDto dto)
    {
        var branchExists = await _context.Branches.AnyAsync(b => b.Id == branchId);
        if (!branchExists)
            return NotFound(new { message = $"Branch with ID {branchId} was not found." });

        var product = new Product
        {
            Name = dto.Name.Trim(),
            Stock = dto.Stock,
            BranchId = branchId
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var response = new ProductResponseDto(product.Id, product.BranchId, product.Name, product.Stock);
        return CreatedAtAction(nameof(GetByBranch), new { branchId }, response);
    }

    // PATCH: api/products/{productId}/stock
    [HttpPatch("products/{productId}/stock")]
    public async Task<ActionResult<ProductResponseDto>> UpdateStock(int productId, [FromBody] UpdateStockDto dto)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null)
            return NotFound(new { message = $"Product with ID {productId} was not found." });

        product.Stock = dto.Stock;
        await _context.SaveChangesAsync();

        var response = new ProductResponseDto(product.Id, product.BranchId, product.Name, product.Stock);
        return Ok(response);
    }
}
