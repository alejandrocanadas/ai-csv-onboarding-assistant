# DEVELOPMENT PROCESS

## 1. Analyze the provided dataset (manually)

### Findings:

- `order_dt` (Date column): Contains many unformatted and empty dates.
- `ship_dt` (Date column): Contains blank dates in shipped orders, which does not make sense, although the date format itself is consistent.
- `cust_name` (Text column): Contains blank customer names.
- `cust_email` (Text column): Contains unformatted emails (e.g., capitalized emails) and blank emails.
- `cust_seg_cd` (Text column): Contains blank codes.
- `prod_cat` (Text column): Contains unformatted product categories and blank values.
- `qty` (Numeric column): Contains negative quantities.
- `unit_price` (Numeric column): Contains blank values.
- `disc_pct` (Numeric column): Contains negative values, blank values, non-percentage values, and unformatted percentage values.
- `currency` (Currency column): Contains blank and unformatted currency values.
- `chnl` (Text column): Contains unformatted channel values.
- `pmt_method` (Text column): Contains blank and unformatted payment methods.
- `ord_status` (Text column): Contains blank and unformatted order statuses.
- `ship_country` (Text column): Contains unformatted shipping country values.
- `ship_region` (Text column): Contains unformatted shipping region values.
- `ship_postal` (Mixed column): Contains different data types.

## 2. Install dependencies

- **Tailwind CSS:** Utility-first CSS framework used for styling the application.
- **PapaParse:** Open-source JavaScript library used to parse and unparse CSV and delimited text files.

## 3. CSV Ingestion Pipeline

- First, we needed to test the CSV ingestion process and verify through a data preview that PapaParse was correctly parsing the provided CSV file.
- The preview was used to validate that the headers, rows, and values were being interpreted correctly before continuing with the data analysis process.

## Tools Used for Development

### 1. Claude Chat & Claude Code

For the project's initial understanding, planning, and development process, I used the Claude Chat and Claude Code environments.

On one hand, **Claude Chat** was a useful tool for further understanding the key points of the assessment and generating a development plan to guide the implementation process.

On the other hand, **Claude Code** led most of the development process for the application. Through clear instructions focused on development best practices, UI inspiration, and development guidance, Claude Code helped build the UI in a clear, smooth, and visually engaging way.

**Model used:** Claude Sonnet 5, which was selected as a practical choice because it balances strong code-generation capabilities, fast response times, and a large context window while maintaining a lower cost compared to higher-tier models.