using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Domain.Entities;

namespace TCG.FreightBroker.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Lane> Lanes => Set<Lane>();
    public DbSet<Load> Loads => Set<Load>();
    public DbSet<Decision> Decisions => Set<Decision>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Client>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Lane>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Client).WithMany(x => x.Lanes).HasForeignKey(x => x.ClientId);
            e.Property(x => x.OriginState).HasMaxLength(2);
            e.Property(x => x.DestinationState).HasMaxLength(2);
            e.Property(x => x.Mode).HasMaxLength(10);
        });

        modelBuilder.Entity<Load>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Lane).WithMany(x => x.Loads).HasForeignKey(x => x.LaneId);
            e.Property(x => x.TargetRate).HasColumnType("decimal(18,2)");
            e.Property(x => x.BookedRate).HasColumnType("decimal(18,2)");
            e.Property(x => x.Status).HasMaxLength(20);
        });

        modelBuilder.Entity<Decision>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Load).WithMany(x => x.Decisions).HasForeignKey(x => x.LoadId);
            e.Property(x => x.Action).HasMaxLength(20);
        });
    }
}
