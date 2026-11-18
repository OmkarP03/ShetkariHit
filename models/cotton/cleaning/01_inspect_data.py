
import pandas as pd

# Load the dataset
df = pd.read_csv(
    "ShetkariHit_Cotton_Rainfall_Import_Export_Area_Production_Yield_2021_2026.csv"
)

# Basic information
print("Dataset shape:", df.shape)

print("\nColumn names:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())

print("\nMissing values in each column:")
print(df.isnull().sum())

print("\nDuplicate rows:", df.duplicated().sum())

print("\nData types:")
print(df.dtypes)
