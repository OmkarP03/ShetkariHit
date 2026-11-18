
import pandas as pd

df = pd.read_csv("cotton_cleaned_stage1.csv")
df["Reported Date"] = pd.to_datetime(df["Reported Date"])

missing_columns = [
    "Area Under Cultivation for Cotton in Lakh Hectare",
    "Cotton Total Production in India Bales(1 Bale = 170kg)",
    "Cotton Yield in Kg/Hectare"
]

# 1. Count missing values year by year
df["Year"] = df["Reported Date"].dt.year

print("MISSING VALUES BY YEAR")
print(df.groupby("Year")[missing_columns].agg(
    lambda column: column.isna().sum()
).to_string())

# 2. Show date ranges where values are missing
print("\nMISSING DATE RANGES")

for column in missing_columns:
    missing_dates = df.loc[df[column].isna(), "Reported Date"]

    print(f"\n{column}")
    print("Missing records:", len(missing_dates))

    if len(missing_dates) > 0:
        print("First missing date:", missing_dates.min())
        print("Last missing date:", missing_dates.max())

# 3. Display the record with inconsistent prices
invalid_prices = (
    (df["Min.Price (Rs/Quintal)"] > df["Max.Price (Rs/Quintal)"])
    | (df["Modal.Price (Rs/Quintal)"] < df["Min.Price (Rs/Quintal)"])
    | (df["Modal.Price (Rs/Quintal)"] > df["Max.Price (Rs/Quintal)"])
)

print("\nINCONSISTENT PRICE RECORDS")
print(df.loc[invalid_prices].to_string(index=False))

print("\nCheck completed!")
