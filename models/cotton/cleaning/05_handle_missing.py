import pandas as pd

# 1. File paths
input_file = "cotton_cleaned_stage1.csv"
output_file = "cotton_cleaned_2026_missing.csv"

# 2. Load the original dataset
df = pd.read_csv(input_file)

# 3. Convert Reported Date into datetime
df["Reported Date"] = pd.to_datetime(
    df["Reported Date"],
    errors="coerce",
    dayfirst=True
)

# 4. Select rows belonging to 2026
mask_2026 = df["Reported Date"].dt.year == 2026

print("Total rows:", len(df))
print("Rows from 2026:", mask_2026.sum())

# 5. Exact column names from your dataset
columns_to_clear = [
    "Area Under Cultivation for Cotton in Lakh Hectare",
    "Cotton Total Production in India Bales(1 Bale = 170kg)",
    "Cotton Yield in Kg/Hectare",
    "Normal Rainfall in mm",
    "Actual Rainfall in mm",
    "% To Normal Rainfall (In %)"
]

# 6. Validate column names
missing_columns = [
    col for col in columns_to_clear if col not in df.columns
]

if missing_columns:
    raise ValueError(f"Columns not found: {missing_columns}")

# 7. Set selected columns to missing for 2026 only
df.loc[mask_2026, columns_to_clear] = float("nan")

# 8. Save to a new CSV
df.to_csv(output_file, index=False, na_rep="")

# 9. Verify the results
print("\nMissing values in selected columns for 2026:")
print(df.loc[mask_2026, columns_to_clear].isna().sum())

print("\nOriginal columns preserved:", len(df.columns))
print("Output saved to:", output_file)