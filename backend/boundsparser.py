import json
import csv

CES_FILE = "water_data.csv"
HOSPITALS_FILE = "/Users/miguelnav/Downloads/cguhackathon/cguhackmockwebsite/la-equity-map/public/hospitals.csv"
OUTPUT_FILE = "filtered_combined_output.csv"

def process_file(filename, lat_col, lon_col, bounds, writer):
    found = 0

    min_lat = bounds["south"]
    max_lat = bounds["north"]
    min_lon = bounds["west"]
    max_lon = bounds["east"]

    with open(filename, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        writer.writerow(header)

        lat_idx = header.index(lat_col)
        lon_idx = header.index(lon_col)

        for row in reader:
            try:
                lat = float(row[lat_idx])
                lon = float(row[lon_idx])

                if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
                    writer.writerow(row)
                    found += 1
            except:
                continue

    print(f"Found {found} rows in {filename}")


def main():
    # ---- Load bounds saved by FastAPI ----
    try:
        with open("selected_bounds.json") as f:
            bounds = json.load(f)
    except FileNotFoundError:
        print("ERROR: You must draw a rectangle first.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as f_out:
        writer = csv.writer(f_out)

        process_file(CES_FILE, "Latitude", "Longitude", bounds, writer)

        writer.writerow([])
        writer.writerow(["===== HOSPITAL DATA ====="])
        writer.writerow([])

        process_file(HOSPITALS_FILE, "lat", "lng", bounds, writer)

    print(f"✓ Saved filtered data to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()