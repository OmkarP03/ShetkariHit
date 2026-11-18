
import pandas as pd

# Load the cleaned dataset
df = pd.read_csv("cotton_cleaned_stage1.csv")

# Convert date to datetime
df["Reported Date"] = pd.to_datetime(df["Reported Date"])

# 1. Add flags for missing agricultural information
agri_columns = [
    "Area Under Cultivation for Cotton in Lakh Hectare",
    "Cotton Total Production in India Bales(1 Bale = 170kg)",
    "Cotton Yield in Kg/Hectare"
]

for col in agri_columns:
    df[col + " Missing"] = df[col].isna().astype(int)

# 2. Identify records with inconsistent prices
df["Price Valid"] = (
    (df["Min.Price (Rs/Quintal)"] <= df["Max.Price (Rs/Quintal)"])
    & (df["Modal.Price (Rs/Quintal)"] >= df["Min.Price (Rs/Quintal)"])
    & (df["Modal.Price (Rs/Quintal)"] <= df["Max.Price (Rs/Quintal)"])
).astype(int)

# 3. Display summary
print("Missing agricultural values:")
print(df[agri_columns].isna().sum())

print("\nPrice validity:")
print(df["Price Valid"].value_counts())

print("\nRows marked as having invalid prices:")
print(df.loc[df["Price Valid"] == 0, [
    "Market",
    "Reported Date",
    "Min.Price (Rs/Quintal)",
    "Max.Price (Rs/Quintal)",
    "Modal.Price (Rs/Quintal)"
]].to_string(index=False))

# 4. Save the prepared dataset
df.to_csv("cotton_prepared_stage2.csv", index=False)

print("\nSaved cotton_prepared_stage2.csv")
