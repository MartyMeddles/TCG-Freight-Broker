using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TCG.FreightBroker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiRecommendationToLoad : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AiRecommendation",
                table: "Loads",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiRecommendation",
                table: "Loads");
        }
    }
}
