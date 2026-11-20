using Franchise.Api.Data;
using Franchise.Api.DTOs;
using Franchise.Api.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Franchise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FranchisesController : ControllerBase
{
    private readonly AppDbContext _context;

    public FranchisesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/franchises
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FranchiseResponseDto>>> GetAll()
    {
        var franchises = await _context.Franchises
            .Select(f => new FranchiseResponseDto(f.Id, f.Name))
            .ToListAsync();

        return Ok(franchises);
    }

    // GET: api/franchises/{franchiseId}
    [HttpGet("{franchiseId}")]
    public async Task<ActionResult<FranchiseResponseDto>> GetById(int franchiseId)
    {
        var franchise = await _context.Franchises
            .Where(f => f.Id == franchiseId)
            .Select(f => new FranchiseResponseDto(f.Id, f.Name))
            .FirstOrDefaultAsync();

        if (franchise == null)
            return NotFound(new { message = $"Franchise with ID {franchiseId} was not found." });

        return Ok(franchise);
    }

    // POST: api/franchises
    [HttpPost]
    public async Task<ActionResult<FranchiseResponseDto>> Create([FromBody] CreateFranchiseDto dto)
    {
        if (!NameValidation.IsValid(dto.Name))
            return BadRequest(new { message = "Franchise name must contain at least 2 non-whitespace characters." });

        var franchise = new Models.Franchise
        {
            Name = dto.Name.Trim()
        };

        _context.Franchises.Add(franchise);
        await _context.SaveChangesAsync();

        var response = new FranchiseResponseDto(franchise.Id, franchise.Name);
        return CreatedAtAction(nameof(GetById), new { franchiseId = franchise.Id }, response);
    }

    // PATCH: api/franchises/{franchiseId}
    [HttpPatch("{franchiseId}")]
    public async Task<ActionResult<FranchiseResponseDto>> UpdateName(int franchiseId, [FromBody] UpdateFranchiseDto dto)
    {
        var franchise = await _context.Franchises.FindAsync(franchiseId);
        if (franchise == null)
            return NotFound(new { message = $"Franchise with ID {franchiseId} was not found." });

        if (!NameValidation.IsValid(dto.Name))
            return BadRequest(new { message = "Franchise name must contain at least 2 non-whitespace characters." });

        franchise.Name = dto.Name.Trim();
        await _context.SaveChangesAsync();

        return Ok(new FranchiseResponseDto(franchise.Id, franchise.Name));
    }

    // DELETE: api/franchises/{franchiseId}
    [HttpDelete("{franchiseId}")]
    public async Task<IActionResult> Delete(int franchiseId)
    {
        var franchise = await _context.Franchises.FindAsync(franchiseId);
        if (franchise == null)
            return NotFound(new { message = $"Franchise with ID {franchiseId} was not found." });

        _context.Franchises.Remove(franchise);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/franchises/{franchiseId}/top-stock-products
    [HttpGet("{franchiseId}/top-stock-products")]
    public async Task<ActionResult<IEnumerable<TopStockProductDto>>> GetTopStockProducts(int franchiseId)
    {
        var franchiseExists = await _context.Franchises.AnyAsync(f => f.Id == franchiseId);
        if (!franchiseExists)
            return NotFound(new { message = $"Franchise with ID {franchiseId} was not found." });

        var branches = await _context.Branches
            .Where(b => b.FranchiseId == franchiseId)
            .Include(b => b.Products)
            .ToListAsync();

        var topProducts = new List<TopStockProductDto>();

        foreach (var branch in branches)
        {
            var maxProduct = branch.Products
                .OrderByDescending(p => p.Stock)
                .FirstOrDefault();

            if (maxProduct != null)
            {
                topProducts.Add(new TopStockProductDto(
                    branch.Id,
                    branch.Name,
                    maxProduct.Id,
                    maxProduct.Name,
                    maxProduct.Stock
                ));
            }
        }

        return Ok(topProducts);
    }
}
