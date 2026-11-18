

import os
import pandas as pd
import numpy as np
import re
import unicodedata

BASE_DIR = r"C:\Projects\EDI\cleaning"

COTTON_FILE = os.path.join(
    BASE_DIR, "cotton_cleaned_stage1.csv"
)

RAINFALL_FILE = os.path.join(
    BASE_DIR, "Maharashtra_Rainfall_Data_June_to_October_2026.xlsx"
)

OUTPUT_FILE = os.path.join(
    BASE_DIR, "cotton_cleaned_with_2026_rainfall.csv"
)

# Validate both files before processing
for file_path in [COTTON_FILE, RAINFALL_FILE]:
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

# Read cotton data from CSV
cotton = pd.read_csv(COTTON_FILE)

# Read rainfall data from Excel
rain_raw = pd.read_excel(
    RAINFALL_FILE,
    sheet_name="Rainfall Jun-Oct 2026",
    header=None
)

print("Cotton rows:", len(cotton))
print("Cotton columns:", len(cotton.columns))
print("Cotton columns available:", cotton.columns.tolist())
print("Both input files found successfully.")


# ==========================================================
# 2. READ THE ORIGINAL FILES
# ==========================================================
cotton = pd.read_csv(COTTON_FILE, sheet_name=0)

# The rainfall file has month names in row 1 and
# rainfall measurement names in row 2.
rain_raw = pd.read_excel(
    RAINFALL_FILE,
    sheet_name="Rainfall Jun-Oct 2026",
    header=None
)

original_row_count = len(cotton)
original_columns = cotton.columns.tolist()

print("Original cotton rows:", original_row_count)
print("Original cotton columns:", len(original_columns))


# ==========================================================
# 3. VALIDATE REQUIRED COLUMNS
# ==========================================================
required_columns = {"District", "Reported Date"}

missing_columns = required_columns - set(cotton.columns)

if missing_columns:
    raise ValueError(
        f"Missing required cotton columns: {missing_columns}"
    )

if rain_raw.shape[0] < 3 or rain_raw.shape[1] < 16:
    raise ValueError(
        "The rainfall worksheet does not have the expected layout."
    )


# ==========================================================
# 4. STANDARDIZE DISTRICT NAMES
# ==========================================================
def normalize_district(value):
    """Standardize district names for reliable matching."""

    if pd.isna(value):
        return None

    value = unicodedata.normalize("NFKC", str(value))
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]", "", value)

    # Known spelling variations across the two files.
    aliases = {
        "amarawati": "amravati",
        "amravati": "amravati",
        "chattrapatisambhajinagar": "chhatrapatisambhajinagar",
        "chhatrapatisambhajinagar": "chhatrapatisambhajinagar",
        "parabhani": "parbhani",
        "parbhani": "parbhani",
        "raigadh": "raigad",
        "raigad": "raigad",
    }

    return aliases.get(value, value)


# ==========================================================
# 5. CONVERT REPORTED DATE TO A REAL DATE
# ==========================================================
# Keep the original Reported Date column unchanged.
# Use a separate internal column for date calculations.

if pd.api.types.is_numeric_dtype(cotton["Reported Date"]):
    # Excel serial date format.
    cotton["_merge_date"] = pd.to_datetime(
        cotton["Reported Date"],
        unit="D",
        origin="1899-12-30",
        errors="coerce"
    )
else:
    cotton["_merge_date"] = pd.to_datetime(
        cotton["Reported Date"],
        errors="coerce",
        dayfirst=True
    )

cotton["_district_key"] = cotton["District"].apply(
    normalize_district
)

cotton["_month_key"] = cotton["_merge_date"].dt.month

cotton["_year_key"] = cotton["_merge_date"].dt.year


# ==========================================================
# 6. CONVERT MONTHLY RAINFALL DATA INTO A MERGE TABLE
# ==========================================================
# Each month occupies four-column positions:
# District | Normal Rainfall | Actual Rainfall | % To Normal
#
# The first two worksheet rows contain the headers.
# Actual district data starts at row index 2.

month_blocks = {
    6:  ("June", 1),
    7:  ("July", 4),
    8:  ("August", 7),
    9:  ("September", 10),
    10: ("October", 13),
}

rainfall_records = []

for month_number, (month_name, start_col) in month_blocks.items():

    for _, row in rain_raw.iloc[2:].iterrows():

        district = row.iloc[0]

        # Ignore empty rows.
        if pd.isna(district):
            continue

        normal = pd.to_numeric(
            pd.Series([row.iloc[start_col]]),
            errors="coerce"
        ).iloc[0]

        actual = pd.to_numeric(
            pd.Series([row.iloc[start_col + 1]]),
            errors="coerce"
        ).iloc[0]

        percent = pd.to_numeric(
            pd.Series([row.iloc[start_col + 2]]),
            errors="coerce"
        ).iloc[0]

        rainfall_records.append({
            "_district_key": normalize_district(district),
            "_month_key": month_number,
            "2026 Normal Rainfall (mm)": normal,
            "2026 Actual Rainfall (mm)": actual,
            "2026 % To Normal Rainfall": percent,
        })


rainfall = pd.DataFrame(rainfall_records)

if rainfall.empty:
    raise ValueError("No rainfall records were read from the file.")

# Each district-month combination must be unique.
duplicate_keys = rainfall.duplicated(
    subset=["_district_key", "_month_key"],
    keep=False
)

if duplicate_keys.any():
    duplicates = rainfall.loc[
        duplicate_keys,
        ["_district_key", "_month_key"]
    ]
    raise ValueError(
        "Duplicate district-month records found in rainfall data:\n"
        + duplicates.to_string(index=False)
    )


# ==========================================================
# 7. MERGE USING DISTRICT + YEAR + MONTH
# ==========================================================
# Only June-October 2026 records can receive 2026 rainfall.
# All other records remain in the dataset.

rainfall["_year_key"] = 2026

rainfall_key_columns = [
    "_district_key",
    "_year_key",
    "_month_key"
]

# Make sure the target columns do not overwrite existing data.
new_rainfall_columns = [
    "2026 Normal Rainfall (mm)",
    "2026 Actual Rainfall (mm)",
    "2026 % To Normal Rainfall"
]

conflicts = set(new_rainfall_columns).intersection(cotton.columns)

if conflicts:
    raise ValueError(
        "Output rainfall columns already exist. "
        "Rename or remove them intentionally before rerunning: "
        f"{conflicts}"
    )

merged = cotton.merge(
    rainfall[rainfall_key_columns + new_rainfall_columns],
    on=rainfall_key_columns,
    how="left",
    validate="many_to_one",
    sort=False,
    indicator="_rainfall_merge_status"
)


# ==========================================================
# 8. VERIFY THAT NO ROWS WERE LOST OR ADDED
# ==========================================================
if len(merged) != original_row_count:
    raise RuntimeError(
        f"Row count changed: {original_row_count} -> {len(merged)}"
    )

if merged[original_columns].isna().sum().to_dict() != (
    cotton[original_columns].isna().sum().to_dict()
):
    raise RuntimeError(
        "Missing-value counts changed in original columns."
    )

if not merged[original_columns].equals(cotton[original_columns]):
    raise RuntimeError(
        "Original data changed during merging. Output not saved."
    )


# ==========================================================
# 9. CREATE AN AUDIT REPORT
# ==========================================================
target_period = (
    merged["_year_key"].eq(2026)
    & merged["_month_key"].between(6, 10)
)

matched = (
    target_period
    & merged["_rainfall_merge_status"].eq("both")
)

unmatched = (
    target_period
    & merged["_rainfall_merge_status"].eq("left_only")
)

unmatched_rows = merged.loc[
    unmatched,
    ["District", "Reported Date"]
].copy()

unmatched_districts = (
    unmatched_rows["District"]
    .dropna()
    .drop_duplicates()
    .sort_values()
    .tolist()
)

summary = pd.DataFrame({
    "Metric": [
        "Original cotton rows",
        "Final cotton rows",
        "Original cotton columns",
        "New rainfall columns added",
        "Rows in June-October 2026",
        "Rows matched to district and month",
        "Rows without rainfall match",
        "Unmatched district count",
    ],
    "Value": [
        original_row_count,
        len(merged),
        len(original_columns),
        len(new_rainfall_columns),
        int(target_period.sum()),
        int(matched.sum()),
        int(unmatched.sum()),
        len(unmatched_districts),
    ]
})

district_report = pd.DataFrame({
    "Unmatched District": unmatched_districts
})

# Remove internal helper columns from the final dataset.
helper_columns = [
    "_merge_date",
    "_district_key",
    "_month_key",
    "_year_key",
    "_rainfall_merge_status",
]

final_data = merged.drop(columns=helper_columns)

# ==========================================================
# 10. SAVE OUTPUT AND AUDIT REPORT
# ==========================================================
with pd.ExcelWriter(OUTPUT_FILE, engine="openpyxl") as writer:

    final_data.to_excel(
        writer,
        sheet_name="Cotton With Rainfall",
        index=False
    )

    summary.to_excel(
        writer,
        sheet_name="Merge Summary",
        index=False
    )

    district_report.to_excel(
        writer,
        sheet_name="Unmatched Districts",
        index=False
    )

    unmatched_rows.to_excel(
        writer,
        sheet_name="Unmatched Rows",
        index=False
    )

print("\nMERGE COMPLETED SUCCESSFULLY")
print("Output file:", os.path.abspath(OUTPUT_FILE))
print("Original rows:", original_row_count)
print("Final rows:", len(final_data))
print("Original columns preserved:", len(original_columns))
print("New rainfall columns:", new_rainfall_columns)
print("2026 rows matched:", int(matched.sum()))
print("Rows without a match:", int(unmatched.sum()))
print("Unmatched districts:", unmatched_districts)
