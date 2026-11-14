import { types } from "./types.js";

const camelize = function (str) {
  return str.replace(/_([a-z])/gi, function (_, match) {
    return match.toUpperCase();
  });
};

// Names accepted for the row delimiting option, ordered from the lowest to the
// highest priority. `record_delimiter` is the canonical name shared with the
// `csv-parse` package, `recordDelimiter` is its camel case alias and
// `row_delimiter`/`rowDelimiter` are the legacy names kept for backward
// compatibility.
const row_delimiter_option_names = [
  "rowDelimiter",
  "row_delimiter",
  "recordDelimiter",
  "record_delimiter",
];

const row_delimiter_option_name_set = new Set(row_delimiter_option_names);

// The last defined name in `row_delimiter_option_names` wins. Iterating over
// the list, instead of over the user options, makes the precedence independent
// from the property insertion order.
const resolve_row_delimiter_option = (opts) => {
  let value;
  for (const name of row_delimiter_option_names) {
    if (opts[name] !== undefined) {
      value = opts[name];
    }
  }
  return value;
};

const normalize_options = (opts) => {
  // Convert Stream Readable options if underscored
  if (opts.object_mode) {
    opts.objectMode = opts.object_mode;
  }
  if (opts.high_water_mark) {
    opts.highWaterMark = opts.high_water_mark;
  }
  // See https://nodejs.org/api/stream.html#stream_new_stream_readable_options
  // Node.js 20 introduced `stream.getDefaultHighWaterMark(opts.objectMode)`
  // opts.highWaterMark = opts.highWaterMark ?? (opts.objectMode ? 16 : 16384);
  // opts.highWaterMark = opts.highWaterMark ?? stream.getDefaultHighWaterMark(opts.objectMode);
  // Clone and camelize options
  const options = {};
  const row_delimiter = resolve_row_delimiter_option(opts);
  for (const k in opts) {
    // The row delimiter is resolved separately to guarantee a deterministic
    // priority between its legacy and its parser aligned names.
    if (row_delimiter_option_name_set.has(k)) continue;
    options[camelize(k)] = opts[k];
  }
  if (row_delimiter !== undefined) {
    options.rowDelimiter = row_delimiter;
  }
  // Normalize options
  const dft = {
    columns: 8,
    delimiter: ",",
    duration: null,
    encoding: null,
    end: null,
    eof: false,
    fixedSize: false,
    length: -1,
    maxWordLength: 16,
    rowDelimiter: "\n",
    seed: false,
    sleep: 0,
  };
  for (const k in dft) {
    if (options[k] === undefined) {
      options[k] = dft[k];
    }
  }
  // Default values
  if (options.eof === true) {
    options.eof = options.rowDelimiter;
  }
  if (typeof options.columns === "number") {
    options.columns = new Array(options.columns);
  }
  const accepted_header_types = Object.keys(types).filter(
    (t) => !["super_", "camelize"].includes(t),
  );
  for (let i = 0; i < options.columns.length; i++) {
    const v = options.columns[i] || "ascii";
    if (typeof v === "string") {
      if (!accepted_header_types.includes(v)) {
        throw Error(
          `Invalid column type: got "${v}", default values are ${JSON.stringify(accepted_header_types)}`,
        );
      }
      options.columns[i] = types[v];
    }
  }
  return options;
};

export { normalize_options };
