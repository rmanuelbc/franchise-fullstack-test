using Franchise.Api.Data;
using Franchise.Api.DTOs;
using Franchise.Api.Models;
using Franchise.Api.Validation;
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

    // GET: api/products/{productId}
    [HttpGet("products/{productId}")]
    public async Task<ActionResult<ProductResponseDto>> GetById(int productId)
    {
        var product = await _context.Products
            .Where(p => p.Id == productId)
            .Select(p => new ProductResponseDto(p.Id, p.BranchId, p.Name, p.Stock))
            .FirstOrDefaultAsync();

        if (product == null)
            return NotFound(new { message = $"Product with ID {productId} was not found." });

        return Ok(product);
    }

    // POST: api/branches/{branchId}/products
    [HttpPost("branches/{branchId}/products")]
    public async Task<ActionResult<ProductResponseDto>> Create(int branchId, [FromBody] CreateProductDto dto)
    {
        if (!NameValidation.IsValid(dto.Name))
            return BadRequest(new { message = "Product name must contain at least 2 non-whitespace characters." });

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
        return CreatedAtAction(nameof(GetById), new { productId = product.Id }, response);
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

    // PATCH: api/products/{productId}
    [HttpPatch("products/{productId}")]
    public async Task<ActionResult<ProductResponseDto>> UpdateName(int productId, [FromBody] UpdateProductNameDto dto)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null)
            return NotFound(new { message = $"Product with ID {productId} was not found." });

        if (!NameValidation.IsValid(dto.Name))
            return BadRequest(new { message = "Product name must contain at least 2 non-whitespace characters." });

        product.Name = dto.Name.Trim();
        await _context.SaveChangesAsync();

        var response = new ProductResponseDto(product.Id, product.BranchId, product.Name, product.Stock);
        return Ok(response);
    }
}
