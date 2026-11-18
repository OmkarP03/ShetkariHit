"""
visualize_cotton.py
-------------------
Generates 14 charts for the ShetkariHit cotton market dataset.
All charts are saved as high-resolution PNGs inside a folder called
'cotton_charts/' and also combined into one PDF report.

Charts included:
  1.  Line      – Monthly avg modal price trend (2021-2026)
  2.  Line      – Year-wise price trends (each year as a separate line)
  3.  Bar       – District-wise total arrivals
  4.  Bar       – Top 10 markets by arrivals
  5.  Bar       – Variety-wise arrivals share
  6.  Pie       – Variety market share (% of arrivals)
  7.  Histogram – Distribution of modal price
  8.  Box       – District-wise modal price spread
  9.  Combo     – Monthly rainfall vs modal price (dual axis)
 10.  Heatmap   – Year × Month avg modal price
 11.  Heatmap   – Full correlation matrix
 12.  Scatter   – Actual rainfall vs modal price (district coloured)
 13.  Stacked   – Year-wise arrivals by variety
 14.  Line      – Cotton import vs export trend (monthly)

Usage:
    python visualize_cotton.py
Place cotton_fixed.xlsx in the same folder.
"""

import os
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from matplotlib.backends.backend_pdf import PdfPages
import seaborn as sns

warnings.filterwarnings("ignore")

# ── CONFIG ────────────────────────────────────────────────────────────────────
INPUT_FILE  = "cotton_fixed.xlsx"
OUT_DIR     = "cotton_charts"
PDF_FILE    = "cotton_charts_report.pdf"

os.makedirs(OUT_DIR, exist_ok=True)

PALETTE     = "tab10"
ACCENT      = "#1F4E79"
LIGHT       = "#EBF3FB"
GREEN       = "#2E7D32"
ORANGE      = "#E65100"
DPI         = 150
TITLE_SIZE  = 14
LABEL_SIZE  = 10
TICK_SIZE   = 9

def savefig(fig, name):
    path = os.path.join(OUT_DIR, name)
    fig.savefig(path, dpi=DPI, bbox_inches="tight")
    print(f"  Saved → {name}")
    return fig

def style_ax(ax, title, xlabel="", ylabel="", grid_axis="y"):
    ax.set_title(title, fontsize=TITLE_SIZE, fontweight="bold", pad=10)
    ax.set_xlabel(xlabel, fontsize=LABEL_SIZE)
    ax.set_ylabel(ylabel, fontsize=LABEL_SIZE)
    ax.tick_params(labelsize=TICK_SIZE)
    if grid_axis:
        ax.grid(axis=grid_axis, linestyle="--", linewidth=0.5, alpha=0.6)
    ax.spines[["top", "right"]].set_visible(False)

# ── LOAD DATA ─────────────────────────────────────────────────────────────────
print("Loading data …")
df = pd.read_excel(INPUT_FILE)
df["date"] = pd.to_datetime(df["date"], dayfirst=True)
df["year"]  = df["date"].dt.year
df["month"] = df["date"].dt.month
df["year_month"] = df["date"].dt.to_period("M")

# district colour map
districts = sorted(df["district"].unique())
dist_colors = dict(zip(districts, sns.color_palette(PALETTE, len(districts))))

figs = []   # collect all figures for PDF

# ═══════════════════════════════════════════════════════════════════════════════
# CHART 1 — Monthly avg modal price trend (overall)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[1/14] Monthly avg modal price trend …")
monthly = (
    df.groupby("year_month")["modal_price"]
    .mean()
    .reset_index()
)
monthly["period"] = monthly["year_month"].dt.to_timestamp()

fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(monthly["period"], monthly["modal_price"],
        color=ACCENT, linewidth=2, marker="o", markersize=3)
ax.fill_between(monthly["period"], monthly["modal_price"],
                alpha=0.12, color=ACCENT)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f}"))
style_ax(ax,
         "Monthly Average Modal Price of Cotton (Jan 2021 – Oct 2026)",
         xlabel="Month", ylabel="Avg Modal Price (Rs/Quintal)")
plt.tight_layout()
figs.append(savefig(fig, "01_monthly_price_trend.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 2 — Year-wise price trends (each year as a separate line)
# ═══════════════════════════════════════════════════════════════════════════════
print("[2/14] Year-wise price trends …")
ym = df.groupby(["year", "month"])["modal_price"].mean().reset_index()
year_colors = sns.color_palette("tab10", ym["year"].nunique())
month_names = ["Jan","Feb","Mar","Apr","May","Jun",
               "Jul","Aug","Sep","Oct","Nov","Dec"]

fig, ax = plt.subplots(figsize=(13, 5))
for color, (yr, grp) in zip(year_colors, ym.groupby("year")):
    ax.plot(grp["month"], grp["modal_price"],
            marker="o", markersize=5, linewidth=2,
            label=str(yr), color=color)

ax.set_xticks(range(1, 13))
ax.set_xticklabels(month_names)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f}"))
ax.legend(title="Year", bbox_to_anchor=(1.01, 1), loc="upper left", fontsize=9)
style_ax(ax,
         "Year-wise Monthly Price Trend — Each Year Compared",
         xlabel="Month", ylabel="Avg Modal Price (Rs/Quintal)")
plt.tight_layout()
figs.append(savefig(fig, "02_yearwise_price_trends.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 3 — District-wise total arrivals (horizontal bar)
# ═══════════════════════════════════════════════════════════════════════════════
print("[3/14] District-wise total arrivals …")
dist_arr = (
    df.groupby("district")["arrivals_tonnes"]
    .sum()
    .sort_values()
)

fig, ax = plt.subplots(figsize=(10, 7))
bars = ax.barh(dist_arr.index, dist_arr.values,
               color=[dist_colors[d] for d in dist_arr.index], edgecolor="white")
for bar in bars:
    ax.text(bar.get_width() + 5000, bar.get_y() + bar.get_height() / 2,
            f"{bar.get_width():,.0f}", va="center", fontsize=8)
ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x/1e6:.1f}M"))
style_ax(ax,
         "District-wise Total Cotton Arrivals (2021–2026)",
         xlabel="Total Arrivals (Tonnes)", grid_axis="x")
plt.tight_layout()
figs.append(savefig(fig, "03_district_arrivals.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 4 — Top 10 markets by arrivals (bar)
# ═══════════════════════════════════════════════════════════════════════════════
print("[4/14] Top 10 markets by arrivals …")
top10 = (
    df.groupby("market")["arrivals_tonnes"]
    .sum()
    .nlargest(10)
    .sort_values()
)
short_names = [m.replace("APMC ", "") for m in top10.index]

fig, ax = plt.subplots(figsize=(10, 6))
bars = ax.barh(short_names, top10.values,
               color=sns.color_palette("Blues_d", 10), edgecolor="white")
for bar in bars:
    ax.text(bar.get_width() + 1000, bar.get_y() + bar.get_height() / 2,
            f"{bar.get_width():,.0f} T", va="center", fontsize=8)
ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x/1e3:.0f}K"))
style_ax(ax,
         "Top 10 Cotton Markets by Total Arrivals",
         xlabel="Total Arrivals (Tonnes)", grid_axis="x")
plt.tight_layout()
figs.append(savefig(fig, "04_top10_markets.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 5 — Variety-wise arrivals (bar)
# ═══════════════════════════════════════════════════════════════════════════════
print("[5/14] Variety-wise arrivals …")
var_arr = (
    df.groupby("variety")["arrivals_tonnes"]
    .sum()
    .sort_values(ascending=False)
)
fig, ax = plt.subplots(figsize=(10, 5))
bars = ax.bar(var_arr.index, var_arr.values,
              color=sns.color_palette("Set2", len(var_arr)), edgecolor="white")
for bar in bars:
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 5000,
            f"{bar.get_height()/1e3:.0f}K", ha="center", fontsize=8)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x/1e6:.1f}M"))
ax.set_xticklabels(var_arr.index, rotation=20, ha="right")
style_ax(ax,
         "Variety-wise Total Cotton Arrivals",
         xlabel="Variety", ylabel="Total Arrivals (Tonnes)")
plt.tight_layout()
figs.append(savefig(fig, "05_variety_arrivals.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 6 — Variety market share (pie / donut)
# ═══════════════════════════════════════════════════════════════════════════════
print("[6/14] Variety market share pie …")
fig, ax = plt.subplots(figsize=(8, 8))
wedges, texts, autotexts = ax.pie(
    var_arr.values,
    labels=var_arr.index,
    autopct="%1.1f%%",
    startangle=140,
    colors=sns.color_palette("Set2", len(var_arr)),
    wedgeprops=dict(width=0.55, edgecolor="white"),
    pctdistance=0.78,
)
for t in texts:
    t.set_fontsize(9)
for at in autotexts:
    at.set_fontsize(8)
ax.set_title("Cotton Variety Market Share\n(% of Total Arrivals)",
             fontsize=TITLE_SIZE, fontweight="bold")
plt.tight_layout()
figs.append(savefig(fig, "06_variety_pie.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 7 — Distribution of modal price (histogram + KDE)
# ═══════════════════════════════════════════════════════════════════════════════
print("[7/14] Modal price distribution …")
fig, ax = plt.subplots(figsize=(10, 5))
sns.histplot(df["modal_price"], bins=60, color=ACCENT,
             kde=True, ax=ax, edgecolor="white", alpha=0.75)
ax.axvline(df["modal_price"].median(), color=ORANGE, linestyle="--",
           linewidth=1.8, label=f"Median ₹{df['modal_price'].median():,.0f}")
ax.axvline(df["modal_price"].mean(), color=GREEN, linestyle="--",
           linewidth=1.8, label=f"Mean ₹{df['modal_price'].mean():,.0f}")
ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f}"))
ax.legend(fontsize=9)
style_ax(ax,
         "Distribution of Modal Price (All Transactions)",
         xlabel="Modal Price (Rs/Quintal)", ylabel="Number of Transactions")
plt.tight_layout()
figs.append(savefig(fig, "07_price_distribution.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 8 — District-wise modal price box plot
# ═══════════════════════════════════════════════════════════════════════════════
print("[8/14] District price box plot …")
dist_order = (
    df.groupby("district")["modal_price"]
    .median()
    .sort_values(ascending=False)
    .index.tolist()
)
fig, ax = plt.subplots(figsize=(14, 6))
sns.boxplot(
    data=df, x="district", y="modal_price",
    order=dist_order,
    palette="tab20",
    flierprops=dict(marker=".", markersize=3, alpha=0.3),
    ax=ax,
)
ax.set_xticklabels(ax.get_xticklabels(), rotation=35, ha="right", fontsize=8)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f}"))
style_ax(ax,
         "District-wise Modal Price Spread (Box Plot)",
         xlabel="District", ylabel="Modal Price (Rs/Quintal)")
plt.tight_layout()
figs.append(savefig(fig, "08_district_price_box.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 9 — Rainfall vs Modal Price (dual-axis combo)
# ═══════════════════════════════════════════════════════════════════════════════
print("[9/14] Rainfall vs modal price combo …")
rain_price = df.groupby("month").agg(
    avg_rain=("actual_rain_mm", "mean"),
    avg_price=("modal_price", "mean"),
    avg_arr=("arrivals_tonnes", "sum"),
).reset_index()

fig, ax1 = plt.subplots(figsize=(12, 5))
ax2 = ax1.twinx()

bars = ax1.bar(rain_price["month"], rain_price["avg_rain"],
               color="#4FC3F7", alpha=0.7, label="Avg Rainfall (mm)", width=0.4)
ax2.plot(rain_price["month"], rain_price["avg_price"],
         color=ORANGE, linewidth=2.5, marker="D", markersize=7, label="Avg Modal Price")
ax2.plot(rain_price["month"], rain_price["avg_arr"] / 1e3,
         color=GREEN, linewidth=1.8, marker="s", markersize=5,
         linestyle="--", label="Total Arrivals (K T)")

ax1.set_xticks(range(1, 13))
ax1.set_xticklabels(month_names)
ax1.set_ylabel("Avg Rainfall (mm)", color="#4FC3F7", fontsize=LABEL_SIZE)
ax2.set_ylabel("Price (Rs/Q)  |  Arrivals (K Tonnes)", fontsize=LABEL_SIZE)
ax1.tick_params(axis="y", labelcolor="#4FC3F7")

lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2,
           loc="upper right", fontsize=9)
ax1.set_title("Monthly Rainfall vs Cotton Price vs Arrivals\n"
              "(Bars = Rainfall, Orange = Price, Green = Arrivals)",
              fontsize=TITLE_SIZE, fontweight="bold")
ax1.spines[["top"]].set_visible(False)
ax1.grid(axis="y", linestyle="--", linewidth=0.4, alpha=0.5)
plt.tight_layout()
figs.append(savefig(fig, "09_rainfall_price_arrivals.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 10 — Heatmap: Year × Month avg modal price
# ═══════════════════════════════════════════════════════════════════════════════
print("[10/14] Year × Month heatmap …")
heat = (
    df.groupby(["year", "month"])["modal_price"]
    .mean()
    .unstack("month")
)
heat.columns = month_names

fig, ax = plt.subplots(figsize=(13, 5))
sns.heatmap(
    heat, annot=True, fmt=".0f", cmap="YlOrRd",
    linewidths=0.5, linecolor="white",
    cbar_kws={"label": "Avg Modal Price (Rs/Q)", "shrink": 0.8},
    ax=ax,
)
ax.set_title("Average Modal Price — Year × Month Heatmap",
             fontsize=TITLE_SIZE, fontweight="bold")
ax.set_xlabel("Month", fontsize=LABEL_SIZE)
ax.set_ylabel("Year", fontsize=LABEL_SIZE)
ax.tick_params(labelsize=TICK_SIZE)
plt.tight_layout()
figs.append(savefig(fig, "10_year_month_heatmap.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 11 — Correlation matrix (full)
# ═══════════════════════════════════════════════════════════════════════════════
print("[11/14] Correlation matrix …")
corr_cols = {
    "modal_price"            : "Modal Price",
    "min_price"              : "Min Price",
    "max_price"              : "Max Price",
    "arrivals_tonnes"        : "Arrivals (T)",
    "normal_rain_mm"         : "Normal Rain",
    "actual_rain_mm"         : "Actual Rain",
    "pct_of_normal_rain"     : "Rain % Normal",
    "cotton_area_lakh_ha"    : "Area (Lakh Ha)",
    "cotton_production_bales": "Production",
    "cotton_yield_kg_ha"     : "Yield (Kg/Ha)",
    "cotton_import_cr"       : "Import (Cr)",
    "cotton_export_cr"       : "Export (Cr)",
}
corr = df[list(corr_cols.keys())].corr()
corr.index   = list(corr_cols.values())
corr.columns = list(corr_cols.values())

mask = np.triu(np.ones_like(corr, dtype=bool))   # show lower triangle only

fig, ax = plt.subplots(figsize=(11, 9))
sns.heatmap(
    corr, mask=mask,
    annot=True, fmt=".2f", cmap="RdYlGn",
    vmin=-1, vmax=1, center=0,
    linewidths=0.5, linecolor="white",
    cbar_kws={"label": "Pearson r", "shrink": 0.8},
    ax=ax,
)
ax.set_title("Correlation Matrix — All Key Variables",
             fontsize=TITLE_SIZE, fontweight="bold")
ax.tick_params(labelsize=8)
plt.tight_layout()
figs.append(savefig(fig, "11_correlation_matrix.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 12 — Scatter: Actual rainfall vs Modal price (coloured by district)
# ═══════════════════════════════════════════════════════════════════════════════
print("[12/14] Rainfall vs price scatter …")
# Aggregate to district-month to reduce overplotting
dm = (
    df.groupby(["district", "year", "month"])
    .agg(modal_price=("modal_price", "mean"),
         actual_rain=("actual_rain_mm", "mean"),
         arrivals=("arrivals_tonnes", "sum"))
    .reset_index()
)
dm_rain = dm[dm["actual_rain"] > 0]   # only months with measurable rain

fig, ax = plt.subplots(figsize=(11, 6))
for dist in districts:
    sub = dm_rain[dm_rain["district"] == dist]
    if sub.empty:
        continue
    ax.scatter(sub["actual_rain"], sub["modal_price"],
               s=sub["arrivals"] / sub["arrivals"].max() * 200 + 20,
               color=dist_colors[dist], alpha=0.55, label=dist, edgecolors="white", linewidth=0.4)

# Trend line
from numpy.polynomial.polynomial import polyfit
x, y = dm_rain["actual_rain"].values, dm_rain["modal_price"].values
c = polyfit(x, y, 1)
xline = np.linspace(x.min(), x.max(), 100)
ax.plot(xline, c[0] + c[1] * xline, color="black",
        linewidth=1.5, linestyle="--", label="Trend")

ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f} mm"))
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f}"))
ax.legend(bbox_to_anchor=(1.01, 1), loc="upper left", fontsize=7, title="District")
style_ax(ax,
         "Actual Rainfall vs Modal Price by District\n(Bubble size = total arrivals that month)",
         xlabel="Actual Rainfall (mm)", ylabel="Avg Modal Price (Rs/Quintal)")
plt.tight_layout()
figs.append(savefig(fig, "12_rain_vs_price_scatter.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 13 — Stacked bar: year-wise arrivals by variety
# ═══════════════════════════════════════════════════════════════════════════════
print("[13/14] Year-wise arrivals by variety …")
var_year = (
    df.groupby(["year", "variety"])["arrivals_tonnes"]
    .sum()
    .unstack("variety")
    .fillna(0)
)
top_varieties = var_arr.nlargest(6).index.tolist()
var_year = var_year[top_varieties]

fig, ax = plt.subplots(figsize=(11, 6))
var_year.plot(kind="bar", stacked=True,
              color=sns.color_palette("Set2", len(top_varieties)),
              edgecolor="white", ax=ax)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x/1e6:.1f}M"))
ax.set_xticklabels(var_year.index, rotation=0)
ax.legend(title="Variety", bbox_to_anchor=(1.01, 1), loc="upper left", fontsize=9)
style_ax(ax,
         "Year-wise Cotton Arrivals by Variety (Stacked)",
         xlabel="Year", ylabel="Total Arrivals (Tonnes)")
plt.tight_layout()
figs.append(savefig(fig, "13_yearwise_variety_stacked.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 14 — Cotton import vs export trend (monthly line)
# ═══════════════════════════════════════════════════════════════════════════════
print("[14/14] Import vs Export trend …")
ie = (
    df.drop_duplicates("year_month")[["year_month", "cotton_import_cr", "cotton_export_cr"]]
    .sort_values("year_month")
    .reset_index(drop=True)
)
ie["period"] = ie["year_month"].dt.to_timestamp()

fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(ie["period"], ie["cotton_import_cr"],
        color=ORANGE, linewidth=2, marker="o", markersize=3, label="Import (Cr Rs)")
ax.plot(ie["period"], ie["cotton_export_cr"],
        color=GREEN, linewidth=2, marker="s", markersize=3, label="Export (Cr Rs)")
ax.fill_between(ie["period"], ie["cotton_import_cr"], ie["cotton_export_cr"],
                where=ie["cotton_export_cr"] >= ie["cotton_import_cr"],
                alpha=0.15, color=GREEN, label="Export > Import")
ax.fill_between(ie["period"], ie["cotton_import_cr"], ie["cotton_export_cr"],
                where=ie["cotton_import_cr"] > ie["cotton_export_cr"],
                alpha=0.15, color=ORANGE, label="Import > Export")
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f} Cr"))
ax.legend(fontsize=9)
style_ax(ax,
         "India Cotton Import vs Export (Monthly Trend)",
         xlabel="Month", ylabel="Value (Crore Rs)")
plt.tight_layout()
figs.append(savefig(fig, "14_import_export_trend.png"))
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# COMBINE ALL CHARTS INTO ONE PDF REPORT
# ═══════════════════════════════════════════════════════════════════════════════
print("\nCombining all charts into PDF …")
chart_files = sorted([
    os.path.join(OUT_DIR, f)
    for f in os.listdir(OUT_DIR)
    if f.endswith(".png")
])

with PdfPages(PDF_FILE) as pdf:
    # Cover page
    fig_cover, ax_cover = plt.subplots(figsize=(11, 8.5))
    ax_cover.axis("off")
    ax_cover.text(0.5, 0.65,
                  "ShetkariHit Cotton Market\nVisualization Report",
                  ha="center", va="center",
                  fontsize=28, fontweight="bold", color=ACCENT)
    ax_cover.text(0.5, 0.45,
                  "Maharashtra · 2021 – 2026\n14 Charts covering Price Trends, Rainfall,\n"
                  "Arrivals, Variety, Import/Export & Correlations",
                  ha="center", va="center", fontsize=14, color="#555555")
    ax_cover.text(0.5, 0.15,
                  f"Total Records: {len(df):,}   |   Districts: {df['district'].nunique()}   "
                  f"|   Markets: {df['market'].nunique()}   |   Varieties: {df['variety'].nunique()}",
                  ha="center", va="center", fontsize=11, color="#777777")
    pdf.savefig(fig_cover, bbox_inches="tight")
    plt.close(fig_cover)

    for img_path in chart_files:
        fig_img, ax_img = plt.subplots(figsize=(11, 8.5))
        img = plt.imread(img_path)
        ax_img.imshow(img)
        ax_img.axis("off")
        pdf.savefig(fig_img, bbox_inches="tight", dpi=DPI)
        plt.close(fig_img)

print(f"\n✅  All done!")
print(f"   PNGs → {OUT_DIR}/   ({len(chart_files)} files)")
print(f"   PDF  → {PDF_FILE}")