#!/usr/bin/env python3
"""
Convert all Excel voter data to a single JSON file for the campaign tracker app.
Handles multiple file formats.
"""

import pandas as pd
import re
import os
import json

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT_FOLDER = os.path.join(os.path.dirname(PROJECT_DIR), "drive-download-20260203T064840Z-3-001")

all_records = []

def extract_pincode(address):
    """Extract 6-digit pincode from address string."""
    if not address:
        return ""
    pin_match = re.search(r"\b\d{6}\b", str(address))
    return pin_match.group(0) if pin_match else ""

def extract_city(address):
    """Try to extract city/area name from address."""
    if not address:
        return ""
    address_upper = str(address).upper()
    cities = ["DELHI", "NOIDA", "GURGAON", "GURUGRAM", "FARIDABAD", "GHAZIABAD",
              "GREATER NOIDA", "KALKAJI", "SAKET", "LAJPAT NAGAR", "CHHALERA",
              "ROHINI", "DWARKA", "JANAKPURI", "PITAMPURA", "PUNJABI BAGH"]
    for city in cities:
        if city in address_upper:
            return city.title()
    return ""

def parse_structured_record(serial, name, info_text, phone):
    """Parse a record from the structured columns (8-16 format)."""
    if not name or str(name) == 'nan' or not str(name).strip():
        return None

    full_name = str(name).strip()
    contact = str(phone).strip() if phone and str(phone) != 'nan' else ""

    # Clean up contact - only keep 10 digits
    contact = re.sub(r'\D', '', contact)
    if len(contact) != 10:
        contact = ""

    # Parse info text for address
    info = str(info_text) if info_text and str(info_text) != 'nan' else ""
    address = ""

    # Try to extract address from info text
    addr_match = re.search(r"Address:\s*(.*)", info, re.DOTALL)
    if addr_match:
        address = addr_match.group(1).strip()

    # Also try Contact pattern to extract contact if not found
    if not contact:
        contact_match = re.search(r"Contact:\s*(\d{10})", info)
        if contact_match:
            contact = contact_match.group(1)

    pincode = extract_pincode(address)
    city = extract_city(address)

    parts = full_name.split()
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    # Generate unique ID from serial + name
    voter_id = str(abs(hash(str(serial) + full_name + contact)) % 100000).zfill(5)

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

def parse_merged_cell(cell_text):
    """Parse a merged cell containing ID, name, D/date, contact, address."""
    text = str(cell_text)
    if not text or text == 'nan':
        return None

    # Pattern: "1  NAME HERE  D/date\nContact: ...\nAddress: ..."
    # The ID is a simple number at the start
    id_match = re.match(r"^\s*(\d+)\s+", text)
    if not id_match:
        return None

    serial = id_match.group(1)
    remaining = text[id_match.end():]

    # Find name (before D/)
    name_match = re.match(r"(.*?)\s+D/", remaining)
    if not name_match:
        return None

    full_name = name_match.group(1).strip()
    if not full_name:
        return None

    # Extract contact
    contact_match = re.search(r"Contact:\s*(\d{10})", text)
    contact = contact_match.group(1) if contact_match else ""

    # Extract address
    address = ""
    addr_match = re.search(r"Address:\s*(.*?)(?:\s*\d{10}|$)", text, re.DOTALL)
    if addr_match:
        address = re.sub(r'\s+', ' ', addr_match.group(1)).strip()

    pincode = extract_pincode(address)
    city = extract_city(address)

    parts = full_name.split()
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    # Generate unique ID
    voter_id = str(abs(hash(serial + full_name + contact)) % 100000).zfill(5)

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

def process_vertical_format(df, col_idx):
    """Process vertical format where data spans multiple rows in a single column."""
    records = []
    seen = set()
    col_data = df.iloc[:, col_idx].astype(str).tolist()

    i = 0
    while i < len(col_data):
        cell = col_data[i]
        if not cell or cell == 'nan':
            i += 1
            continue

        # Check if this looks like an ID + Name cell (e.g., "60003\nSUKANTA SARKAR")
        # or just a name that's not Contact/Address
        if 'Contact:' in cell or 'Address:' in cell:
            i += 1
            continue

        # Try to extract ID and name from same cell
        id_name_match = re.match(r'^\s*(\d+)\s*\n?\s*([A-Z][A-Z\s]+)', cell)
        if id_name_match:
            serial = id_name_match.group(1)
            name = id_name_match.group(2).strip()
            contact = ""
            address = ""

            # Look ahead for contact and address
            for j in range(i + 1, min(i + 5, len(col_data))):
                next_cell = col_data[j]
                if 'Contact:' in next_cell:
                    contact_match = re.search(r'Contact:\s*(\d{10})', next_cell)
                    if contact_match:
                        contact = contact_match.group(1)
                elif 'Address:' in next_cell:
                    address = next_cell.replace('Address:', '').strip()

            if name:
                key = name + contact
                if key not in seen:
                    seen.add(key)
                    voter_id = str(abs(hash(serial + name + contact)) % 100000).zfill(5)
                    parts = name.split()
                    first_name = parts[0] if parts else ""
                    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
                    records.append({
                        "id": voter_id,
                        "firstName": first_name,
                        "lastName": last_name,
                        "fullName": name,
                        "contact": contact,
                        "address": address,
                        "pincode": extract_pincode(address),
                        "city": extract_city(address)
                    })
        i += 1

    return records, seen

def process_standard_format(df):
    """Process files with multiple columns - handles various layouts."""
    records = []
    seen = set()
    num_cols = len(df.columns)

    # First try standard structured format
    for _, row in df.iterrows():
        # For 10-column format (Part4 style): cols 6 (id), 7 (name), 8 (info), 9 (phone)
        if num_cols == 10:
            record = parse_structured_record(row.iloc[6], row.iloc[7], row.iloc[8], row.iloc[9])
            if record:
                key = record["fullName"] + record["contact"]
                if key not in seen:
                    seen.add(key)
                    records.append(record)
        else:
            # For 17-column format: cols 8 (id), 9 (name), 10 (info), 11 (phone)
            if num_cols > 11:
                record = parse_structured_record(row.iloc[8], row.iloc[9], row.iloc[10], row.iloc[11])
                if record:
                    key = record["fullName"] + record["contact"]
                    if key not in seen:
                        seen.add(key)
                        records.append(record)

            # Second voter in row: cols 13 (id), 14 (name), 15 (info), 16 (phone)
            if num_cols > 16:
                record = parse_structured_record(row.iloc[13], row.iloc[14], row.iloc[15], row.iloc[16])
                if record:
                    key = record["fullName"] + record["contact"]
                    if key not in seen:
                        seen.add(key)
                        records.append(record)

        # Also try merged cells in columns 0 and 1
        for col_idx in [0, 1]:
            if col_idx < len(row):
                record = parse_merged_cell(row.iloc[col_idx])
                if record:
                    key = record["fullName"] + record["contact"]
                    if key not in seen:
                        seen.add(key)
                        records.append(record)

    # Also try vertical format in columns 8 and 13 for mixed files (17-col format only)
    if num_cols > 13:
        for col_idx in [8, 13]:
            if num_cols > col_idx:
                vert_records, vert_seen = process_vertical_format(df, col_idx)
                for rec in vert_records:
                    key = rec["fullName"] + rec["contact"]
                    if key not in seen:
                        seen.add(key)
                        records.append(rec)

    return records

def process_two_column_format(df):
    """Process files with 2-3 columns - data spans multiple rows."""
    records = []
    seen = set()

    # For each column, try to reconstruct records
    for col in df.columns:
        col_data = df[col].astype(str).tolist()

        i = 0
        while i < len(col_data):
            cell = col_data[i]

            if not cell or cell == 'nan' or cell.startswith('Contact:') or cell.startswith('Address:'):
                i += 1
                continue

            # Check if this cell has ID + Name (e.g., "63670\nSANDEEP KUMAR")
            id_name_match = re.match(r'^\s*(\d+)\s*\n\s*([A-Z][A-Z\s]+)', cell)
            if id_name_match:
                serial = id_name_match.group(1)
                name = id_name_match.group(2).strip()
            else:
                # Just a name
                serial = ""
                name = cell.strip()

            # Skip if name looks like just a number or is too short
            if not name or len(name) < 3 or name.isdigit():
                i += 1
                continue

            contact = ""
            address = ""
            skip_rows = 1

            # Check next row for contact
            if i + 1 < len(col_data) and 'Contact:' in col_data[i + 1]:
                contact_match = re.search(r"Contact:\s*(\d{10})", col_data[i + 1])
                contact = contact_match.group(1) if contact_match else ""
                skip_rows = 2

            # Check for address (may span multiple rows)
            addr_start = i + skip_rows
            if addr_start < len(col_data):
                addr_cell = col_data[addr_start]
                if 'Address:' in addr_cell:
                    address = addr_cell.replace("Address:", "").strip()
                    skip_rows += 1

                    # Check if address continues to next row (no Contact/ID pattern)
                    while skip_rows + i < len(col_data):
                        next_cell = col_data[i + skip_rows]
                        # Stop if next cell has Contact, Address, or looks like ID+Name
                        if (not next_cell or next_cell == 'nan' or
                            'Contact:' in next_cell or 'Address:' in next_cell or
                            re.match(r'^\s*\d+\s*\n', next_cell) or
                            re.match(r'^[A-Z][A-Z\s]{5,}$', next_cell.strip())):
                            break
                        # This looks like address continuation
                        if next_cell.strip() and not next_cell.strip().isdigit():
                            address += " " + next_cell.strip()
                            skip_rows += 1
                        else:
                            break

            if name and (contact or address):
                key = name + contact
                if key not in seen:
                    seen.add(key)
                    voter_id = str(abs(hash((serial or "") + name + contact)) % 100000).zfill(5)

                    parts = name.split()
                    first_name = parts[0] if parts else ""
                    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

                    records.append({
                        "id": voter_id,
                        "firstName": first_name,
                        "lastName": last_name,
                        "fullName": name,
                        "contact": contact,
                        "address": address,
                        "pincode": extract_pincode(address),
                        "city": extract_city(address)
                    })
                    i += skip_rows
                    continue
            i += 1

    return records

def main():
    global all_records
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
            num_cols = len(df.columns)

            if num_cols <= 3:
                # Two-column format (Part20, Part21 style)
                records = process_two_column_format(df)
                print(f"  (2-col format) Found {len(records)} records")
            else:
                # Standard multi-column format
                records = process_standard_format(df)
                print(f"  (standard format) Found {len(records)} records")

            all_records.extend(records)

        except Exception as e:
            print(f"  Error processing {file}: {e}")

    # Remove duplicates by fullName + contact (more reliable than hash ID)
    seen_keys = set()
    unique_records = []
    for r in all_records:
        key = r["fullName"] + r["contact"]
        if key not in seen_keys:
            seen_keys.add(key)
            # Generate unique sequential ID to avoid hash collisions
            r["id"] = str(len(unique_records) + 1).zfill(6)
            unique_records.append(r)

    print(f"\n{'='*50}")
    print(f"Total records found: {len(all_records)}")
    print(f"Total unique voters: {len(unique_records)}")

    return unique_records

if __name__ == "__main__":
    voters = main()
    if voters:
        # Upload directly to Supabase
        print("\nUploading to Supabase...")
        from supabase import create_client

        url = "https://llpesyipoctecfftmher.supabase.co"
        key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscGVzeWlwb2N0ZWNmZnRtaGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwOTM2MjEsImV4cCI6MjA4NTY2OTYyMX0.KtUYxbaTZOQOp54boiyngGbu4UjgCWzUhK2fckXWm3k"

        supabase = create_client(url, key)

        # Clear existing data
        print("Clearing existing voters...")
        supabase.table("voters").delete().neq("id", "").execute()

        # Convert to DB format
        db_records = []
        for v in voters:
            db_records.append({
                "id": v["id"],
                "first_name": v["firstName"],
                "last_name": v["lastName"],
                "full_name": v["fullName"],
                "contact": v["contact"],
                "address": v["address"],
                "pincode": v["pincode"],
                "city": v["city"]
            })

        # Upload in batches
        batch_size = 500
        for i in range(0, len(db_records), batch_size):
            batch = db_records[i:i+batch_size]
            try:
                supabase.table("voters").upsert(batch).execute()
                if (i // batch_size) % 10 == 0:
                    print(f"Uploaded {min(i+batch_size, len(db_records))}/{len(db_records)}")
            except Exception as e:
                print(f"Error at batch {i}: {e}")

        # Verify
        result = supabase.table("voters").select("id", count="exact").execute()
        print(f"\nTotal in database: {result.count}")
