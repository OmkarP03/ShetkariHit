
import pandas as pd

# 1. Load the original dataset
input_file = "ShetkariHit_Cotton_Rainfall_Import_Export_Area_Production_Yield_2021_2026.csv"
df = pd.read_csv(input_file)

print("Original shape:", df.shape)

# 2. Remove extra spaces from column names
df.columns = df.columns.str.strip()

# 3. Convert text columns containing numbers into numeric values
numeric_columns = [
    "Arrivals (Tonnes)",
    "Min.Price (Rs/Quintal)",
    "Max.Price (Rs/Quintal)",
    "Modal.Price (Rs/Quintal)"
]

for col in numeric_columns:
    df[col] = pd.to_numeric(
        df[col].astype(str).str.replace(",", "", regex=False).str.strip(),
        errors="coerce"
    )

# 4. Convert reported date into a proper date format
df["Reported Date"] = pd.to_datetime(
    df["Reported Date"],
    errors="coerce"
)

# 5. Remove exact duplicate rows
duplicates_before = df.duplicated().sum()
df = df.drop_duplicates().copy()

# 6. Check whether market prices are logically consistent
invalid_prices = (
    (df["Min.Price (Rs/Quintal)"] > df["Max.Price (Rs/Quintal)"])
    | (df["Modal.Price (Rs/Quintal)"] < df["Min.Price (Rs/Quintal)"])
    | (df["Modal.Price (Rs/Quintal)"] > df["Max.Price (Rs/Quintal)"])
)

print("\nDuplicate rows removed:", duplicates_before)
print("Rows with inconsistent prices:", invalid_prices.sum())

# Do not delete questionable price rows automatically.
# We will inspect them before deciding what to do.

# 7. Check missing values after conversion
print("\nMissing values after cleaning:")
print(df.isnull().sum())

# 8. Save the cleaned intermediate dataset
output_file = "cotton_cleaned_stage1.csv"
df.to_csv(output_file, index=False)

print("\nCleaned dataset shape:", df.shape)
print("Saved file:", output_file)
print("\nStep 2 completed!")
