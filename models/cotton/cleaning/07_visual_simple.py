import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

# Keep this script in the same folder as cotton_cleaned_stage1.csv
INPUT_FILE = "cotton_cleaned_stage1.csv"
OUTPUT_DIR = "cotton_simple_visualizations"
os.makedirs(OUTPUT_DIR, exist_ok=True)

df = pd.read_csv(INPUT_FILE)

# Parse dates without changing the original date text in df
dates = pd.to_datetime(
    df["Reported Date"], format="mixed", errors="coerce", dayfirst=True
)

target = "Modal.Price (Rs/Quintal)"
numeric_cols = [
    target,
    "Arrivals (Tonnes)",
    "Actual Rainfall in mm",
    "Normal Rainfall in mm",
    "% To Normal Rainfall (In %)",
    "Area Under Cultivation for Cotton in Lakh Hectare",
    "Cotton Total Production in India Bales(1 Bale = 170kg)",
    "Cotton Yield in Kg/Hectare",
    "Cotton Import in Crore Rs by India",
    "Cotton Export in Crore Rs by India",
]
for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# Keep price-consistent rows for graphs about modal price
min_col = "Min.Price (Rs/Quintal)"
max_col = "Max.Price (Rs/Quintal)"
valid = df[target].notna()
if min_col in df.columns and max_col in df.columns:
    valid &= df[min_col].notna() & df[max_col].notna()
    valid &= (df[min_col] <= df[target]) & (df[target] <= df[max_col])

p = df.loc[valid].copy()
p["_date"] = dates.loc[valid]
plots = []

def finish(fig, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    plots.append(path)

# 1. Simple line graph: monthly average modal price
tmp = p.dropna(subset=["_date", target]).copy()
tmp["Month"] = tmp["_date"].dt.to_period("M").dt.to_timestamp()
monthly = tmp.groupby("Month")[target].mean()
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(monthly.index, monthly.values, marker="o", linewidth=2)
ax.set_title("1. How Cotton Modal Price Changes Over Time")
ax.set_xlabel("Month")
ax.set_ylabel("Average modal price (₹/quintal)")
ax.grid(axis="y", alpha=.3)
finish(fig, "01_monthly_average_modal_price.png")

# Helper for simple bar charts using bins
def binned_bar(data, feature, title, xlabel, filename, bins=5, zero_as_missing=False):
    s = data[[feature, target]].dropna().copy()
    if zero_as_missing:
        s = s[s[feature] > 0]
    if len(s) < 10 or s[feature].nunique() < 2:
        fig, ax = plt.subplots(figsize=(8, 4.5))
        ax.text(.5, .5, "Not enough valid data to show this relationship",
                ha="center", va="center", transform=ax.transAxes)
        ax.set_axis_off()
        finish(fig, filename)
        return
    try:
        s["Group"] = pd.qcut(s[feature], q=min(bins, s[feature].nunique()),
                             duplicates="drop")
    except ValueError:
        s["Group"] = pd.cut(s[feature], bins=bins)
    grouped = s.groupby("Group", observed=True)[target].agg(["mean", "count"]).reset_index()
    labels = [str(x) for x in grouped["Group"]]
    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(range(len(grouped)), grouped["mean"])
    ax.set_xticks(range(len(grouped)))
    ax.set_xticklabels(labels, rotation=25, ha="right")
    ax.set_title(title)
    ax.set_xlabel(xlabel + " (grouped into ranges)")
    ax.set_ylabel("Average modal price (₹/quintal)")
    ax.grid(axis="y", alpha=.3)
    for bar, count in zip(bars, grouped["count"]):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height(),
                f"n={count:,}", ha="center", va="bottom", fontsize=8)
    finish(fig, filename)

# 2. Arrivals vs modal price: simple bar chart of average price for arrivals ranges
binned_bar(p, "Arrivals (Tonnes)", "2. Does Average Modal Price Differ with Arrivals?",
           "Arrivals in tonnes", "02_arrivals_ranges_vs_price.png")

# 3. Rainfall vs modal price: zeros shown as stored; explain limitation
binned_bar(p, "Actual Rainfall in mm", "3. Average Modal Price Across Rainfall Ranges",
           "Actual rainfall in mm", "03_rainfall_ranges_vs_price.png")

# 4. Average modal price by top varieties
if "Variety" in p.columns:
    variety_counts = p["Variety"].fillna("Missing").value_counts()
    top = variety_counts.head(8).index
    s = p[p["Variety"].fillna("Missing").isin(top)].copy()
    avgs = s.groupby(s["Variety"].fillna("Missing"))[target].mean().sort_values()
    fig, ax = plt.subplots(figsize=(10, 5.5))
    bars = ax.barh(avgs.index.astype(str), avgs.values)
    ax.set_title("4. Average Modal Price by Common Cotton Varieties")
    ax.set_xlabel("Average modal price (₹/quintal)")
    ax.set_ylabel("Cotton variety")
    ax.grid(axis="x", alpha=.3)
    for bar, name in zip(bars, avgs.index):
        n = int((s["Variety"].fillna("Missing") == name).sum())
        ax.text(bar.get_width(), bar.get_y()+bar.get_height()/2, f"  n={n:,}", va="center", fontsize=8)
    finish(fig, "04_average_price_by_variety.png")

# 5. Average modal price by top districts
if "District" in p.columns:
    district_counts = p["District"].fillna("Missing").value_counts()
    top = district_counts.head(10).index
    s = p[p["District"].fillna("Missing").isin(top)].copy()
    avgs = s.groupby(s["District"].fillna("Missing"))[target].mean().sort_values()
    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(avgs.index.astype(str), avgs.values)
    ax.set_title("5. Average Modal Price by Most-Represented Districts")
    ax.set_xlabel("Average modal price (₹/quintal)")
    ax.set_ylabel("District")
    ax.grid(axis="x", alpha=.3)
    for bar, name in zip(bars, avgs.index):
        n = int((s["District"].fillna("Missing") == name).sum())
        ax.text(bar.get_width(), bar.get_y()+bar.get_height()/2, f"  n={n:,}", va="center", fontsize=8)
    finish(fig, "05_average_price_by_district.png")

# 6. Simple horizontal bar chart: numerical features' Spearman relationship with modal price
corr_features = [
    "Arrivals (Tonnes)", "Actual Rainfall in mm", "Normal Rainfall in mm",
    "% To Normal Rainfall (In %)",
    "Area Under Cultivation for Cotton in Lakh Hectare",
    "Cotton Total Production in India Bales(1 Bale = 170kg)",
    "Cotton Yield in Kg/Hectare", "Cotton Import in Crore Rs by India",
    "Cotton Export in Crore Rs by India"
]
available = [c for c in corr_features if c in p.columns]
corrs = p[available + [target]].corr(method="spearman")[target].drop(target).dropna().sort_values()
fig, ax = plt.subplots(figsize=(10, 6))
colors = ["#d97979" if v < 0 else "#5a9e8a" for v in corrs.values]
ax.barh(corrs.index, corrs.values, color=colors)
ax.axvline(0, color="black", linewidth=1)
ax.set_xlim(-1, 1)
ax.set_title("6. Which Numeric Fields Move with Modal Price?")
ax.set_xlabel("Spearman relationship with modal price (-1 to +1)")
ax.set_ylabel("Field")
ax.grid(axis="x", alpha=.25)
for y, v in enumerate(corrs.values):
    ax.text(v + (0.02 if v >= 0 else -0.02), y, f"{v:.2f}",
            va="center", ha="left" if v >= 0 else "right", fontsize=8)
fig.text(.01, .005,
         "Correlation shows association, not cause. Min/max price are not included because they may leak the target.",
         fontsize=8)
finish(fig, "06_simple_price_relationships.png")

pdf_path = os.path.join(OUTPUT_DIR, "cotton_simple_visualizations.pdf")
with PdfPages(pdf_path) as pdf:
    for path in plots:
        img = plt.imread(path)
        fig, ax = plt.subplots(figsize=(11.7, 8.3))
        ax.imshow(img)
        ax.axis("off")
        pdf.savefig(fig, bbox_inches="tight")
        plt.close(fig)

print(f"Rows in source: {len(df):,}; columns preserved: {len(df.columns)}")
print(f"Price-consistent records used: {len(p):,}")
print("Created 6 simple graphs and PDF in:", OUTPUT_DIR)
