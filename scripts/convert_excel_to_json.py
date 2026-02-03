#!/usr/bin/env python3
"""
Convert all Excel voter data to a single JSON file for the campaign tracker app.
Run this from the campaigntracker directory:
    python scripts/convert_excel_to_json.py
"""

import pandas as pd
import re
import os
import json

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT_FOLDER = os.path.join(os.path.dirname(PROJECT_DIR), "input_files")
OUTPUT_FILE = os.path.join(PROJECT_DIR, "src", "data", "voters.json")

all_records = []

def extract_pincode(address):
    """Extract 6-digit pincode from address string."""
    pin_match = re.search(r"\b\d{6}\b", address)
    return pin_match.group(0) if pin_match else ""

def extract_city(address):
    """Try to extract city/area name from address."""
    # Common patterns: city names often appear before pincode or at end
    address_upper = address.upper()

    # Known cities/areas to look for
    cities = ["DELHI", "NOIDA", "GURGAON", "GURUGRAM", "FARIDABAD", "GHAZIABAD",
              "GREATER NOIDA", "KALKAJI", "SAKET", "LAJPAT NAGAR", "CHHALERA"]

    for city in cities:
        if city in address_upper:
            return city.title()

    # Fallback: try to extract area from address
    return ""

def parse_record(text):
    """Parse a voter record from raw text."""
    text = re.sub(r"\s+", " ", str(text)).strip()

    id_match = re.search(r"\b(\d{5})\b", text)
    if not id_match:
        return None
    voter_id = id_match.group(1)

    name_match = re.search(r"\d{5}\s+(.*?)\s+D/", text)
    if not name_match:
        return None
    full_name = name_match.group(1).strip()

    contact_match = re.search(r"Contact:\s*(\d{10})", text)
    contact = contact_match.group(1) if contact_match else ""

    address_match = re.search(r"Address:\s*(.*)", text)
    address = address_match.group(1).strip() if address_match else ""

    pincode = extract_pincode(address)
    city = extract_city(address)

    parts = full_name.split()
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    return {
        "id": voter_id,
        "firstName": first_name,
        "lastName": last_name,
        "fullName": full_name,
        "contact": contact,
        "address": address,
        "pincode": pincode,
        "city": city
    }

def main():
    print(f"Reading Excel files from: {INPUT_FOLDER}")

    if not os.path.exists(INPUT_FOLDER):
        print(f"Error: Input folder not found: {INPUT_FOLDER}")
        return

    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith(".xlsx")]
    print(f"Found {len(files)} Excel files")

    for i, file in enumerate(files, 1):
        print(f"Processing {i}/{len(files)}: {file}")
        try:
            df = pd.read_excel(os.path.join(INPUT_FOLDER, file))

            for _, row in df.iterrows():
                for cell in row:
                    if isinstance(cell, str) and re.search(r"\b\d{5}\b", cell):
                        record = parse_record(cell)
                        if record:
                            all_records.append(record)
        except Exception as e:
            print(f"  Error processing {file}: {e}")

    # Create DataFrame and remove duplicates
    final_df = pd.DataFrame(all_records)
    final_df.drop_duplicates(subset=["id"], inplace=True)

    # Convert to list of dicts for JSON
    voters = final_df.to_dict(orient="records")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    # Write JSON file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(voters, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Total unique voters: {len(voters)}")
    print(f"Output saved to: {OUTPUT_FILE}")
    print(f"File size: {os.path.getsize(OUTPUT_FILE) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()
