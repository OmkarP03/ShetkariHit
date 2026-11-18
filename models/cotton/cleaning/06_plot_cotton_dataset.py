import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

# Put this script in the same folder as cotton_cleaned_stage1.csv.
INPUT_FILE = "cotton_cleaned_stage1.csv"
OUTPUT_DIR = "cotton_visualizations"
os.makedirs(OUTPUT_DIR, exist_ok=True)

df = pd.read_csv(INPUT_FILE)
dates = pd.to_datetime(df["Reported Date"], format="mixed", errors="coerce", dayfirst=True)

target = "Modal.Price (Rs/Quintal)"
arrivals = "Arrivals (Tonnes)"
min_price = "Min.Price (Rs/Quintal)"
max_price = "Max.Price (Rs/Quintal)"
rainfall = "Actual Rainfall in mm"
variety = "Variety"
district = "District"

numeric_cols = [
    target, arrivals, min_price, max_price, rainfall, "Normal Rainfall in mm",
    "% To Normal Rainfall (In %)",
    "Area Under Cultivation for Cotton in Lakh Hectare",
    "Cotton Total Production in India Bales(1 Bale = 170kg)",
    "Cotton Yield in Kg/Hectare", "Cotton Import in Crore Rs by India",
    "Cotton Export in Crore Rs by India"
]
for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

valid_price = (
    df[target].notna() & df[min_price].notna() & df[max_price].notna()
    & (df[min_price] <= df[target]) & (df[target] <= df[max_price])
)
price_df = df.loc[valid_price].copy()
price_dates = dates.loc[valid_price]
excluded = int((df[target].notna() & df[min_price].notna() & df[max_price].notna() & ~valid_price).sum())
files = []

def save_fig(fig, name):
    path = os.path.join(OUTPUT_DIR, name)
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    files.append(path)

# Graph 1: monthly median modal price
trend = pd.DataFrame({"date": price_dates, "modal": price_df[target].values}).dropna()
trend["month"] = trend["date"].dt.to_period("M").dt.to_timestamp()
monthly = trend.groupby("month")["modal"].median()
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.plot(monthly.index, monthly.values, marker="o", markersize=3)
ax.set(title="1. Cotton Modal Price Over Time (Monthly Median)", xlabel="Reported month", ylabel="Median modal price (₹/quintal)")
ax.grid(True, alpha=0.3)
fig.text(0.01, -0.02, f"Price-consistent records only; excluded {excluded} record(s) with modal price outside min/max range.", fontsize=8)
save_fig(fig, "01_monthly_modal_price_trend.png")

# Graph 2: arrivals vs modal price
s = price_df[[arrivals, target]].dropna()
if len(s) > 7000: s = s.sample(7000, random_state=42)
rho = price_df[[arrivals, target]].corr(method="spearman").iloc[0, 1]
fig, ax = plt.subplots(figsize=(8.5, 5.5))
ax.scatter(s[arrivals], s[target], alpha=0.25, s=12)
ax.set(title="2. Arrivals vs Cotton Modal Price", xlabel="Arrivals (tonnes)", ylabel="Modal price (₹/quintal)")
ax.grid(True, alpha=0.25)
ax.text(0.02, 0.98, f"Spearman correlation = {rho:.3f}\\nDisplayed points: {len(s):,}", transform=ax.transAxes, va="top")
save_fig(fig, "02_arrivals_vs_modal_price.png")

# Graph 3: actual rainfall vs modal price
r = price_df[[rainfall, target]].dropna()
plot_r = r.sample(7000, random_state=42) if len(r) > 7000 else r
zero_pct = (r[rainfall] == 0).mean() * 100 if len(r) else np.nan
rho_r = r.corr(method="spearman").iloc[0, 1] if len(r) > 1 else np.nan
fig, ax = plt.subplots(figsize=(8.5, 5.5))
ax.scatter(plot_r[rainfall], plot_r[target], alpha=0.25, s=12)
ax.set(title="3. Actual Rainfall vs Cotton Modal Price", xlabel="Actual rainfall (mm)", ylabel="Modal price (₹/quintal)")
ax.grid(True, alpha=0.25)
ax.text(0.02, 0.98, f"Spearman correlation = {rho_r:.3f}\\nZero-rainfall rows: {zero_pct:.1f}%", transform=ax.transAxes, va="top")
fig.text(0.01, -0.02, "Rainfall zeros are shown as stored; the graph cannot distinguish true zero from unavailable data.", fontsize=8)
save_fig(fig, "03_rainfall_vs_modal_price.png")

# Graph 4: price by top varieties
counts = price_df[variety].fillna("Missing").value_counts()
top = counts.head(8).index.tolist()
data, labels = [], []
for v in top:
    vals = price_df.loc[price_df[variety].fillna("Missing") == v, target].dropna()
    if len(vals): data.append(vals.values); labels.append(f"{v}\\n(n={len(vals):,})")
fig, ax = plt.subplots(figsize=(10, 5.8))
ax.boxplot(data, tick_labels=labels, showfliers=False)
ax.set(title="4. Modal Price by Cotton Variety (Top 8 by Record Count)", xlabel="Variety", ylabel="Modal price (₹/quintal)")
ax.grid(True, axis="y", alpha=0.3)
save_fig(fig, "04_modal_price_by_variety.png")

# Graph 5: price by top districts
counts = price_df[district].fillna("Missing").value_counts()
top = counts.head(10).index.tolist()
data, labels = [], []
for d in top:
    vals = price_df.loc[price_df[district].fillna("Missing") == d, target].dropna()
    if len(vals): data.append(vals.values); labels.append(f"{d}\\n(n={len(vals):,})")
fig, ax = plt.subplots(figsize=(11, 6))
ax.boxplot(data, tick_labels=labels, showfliers=False)
ax.set(title="5. Modal Price Across the 10 Most-Represented Districts", xlabel="District", ylabel="Modal price (₹/quintal)")
ax.grid(True, axis="y", alpha=0.3)
save_fig(fig, "05_modal_price_by_district.png")

# Graph 6: numerical Spearman correlation heatmap
corr_cols = [c for c in numeric_cols if c in df.columns]
cdata = df[corr_cols].copy()
cdata.loc[~valid_price, target] = np.nan
corr = cdata.corr(method="spearman")
fig, ax = plt.subplots(figsize=(11, 8))
im = ax.imshow(corr.values, aspect="auto", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr.columns))); ax.set_yticks(range(len(corr.index)))
ax.set_xticklabels(corr.columns, rotation=75, ha="right", fontsize=7)
ax.set_yticklabels(corr.index, fontsize=7)
ax.set_title("6. Spearman Correlation Between Numerical Fields")
for i in range(len(corr.index)):
    for j in range(len(corr.columns)):
        v = corr.iloc[i, j]
        if pd.notna(v): ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=6)
fig.colorbar(im, ax=ax, label="Spearman correlation (-1 to +1)", shrink=0.8)
fig.text(0.01, 0.005, "Correlation is association, not causation. Min/max prices can cause target leakage if used to predict modal price.", fontsize=8)
save_fig(fig, "06_spearman_correlation_heatmap.png")

with PdfPages(os.path.join(OUTPUT_DIR, "cotton_dataset_visualizations.pdf")) as pdf:
    for path in files:
        image = plt.imread(path)
        fig, ax = plt.subplots(figsize=(11.7, 8.3))
        ax.imshow(image); ax.axis("off")
        pdf.savefig(fig, bbox_inches="tight")
        plt.close(fig)

print(f"Rows: {len(df):,} | Columns: {len(df.columns)} | Price-inconsistent records excluded from price plots: {excluded}")
print("Saved 6 graphs and a 6-page PDF in:", OUTPUT_DIR)
