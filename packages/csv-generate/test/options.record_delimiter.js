import "should";
import { generate } from "../lib/index.js";
import { generate as generateSync } from "../lib/sync.js";

// `record_delimiter` is the name shared with the `csv-parse` package,
// `row_delimiter` is the legacy name. Both must produce byte for byte
// identical artifacts, whether the option is explicitly provided or omitted.
const base = { seed: 1, columns: 3, length: 2, encoding: "ascii" };

const callback = (options) =>
  new Promise((resolve, reject) => {
    generate(options, (err, data) => (err ? reject(err) : resolve(data)));
  });

describe("Option `record_delimiter`", function () {
  describe("comparison with `row_delimiter`", function () {
    it("defaults to unix style when neither name is provided", function (next) {
      generate({ ...base, length: 10 }, (err, data) => {
        if (err) return next(err);
        data.split("\n").length.should.eql(10);
        next();
      });
    });

    it("explicit value generates the same artifact as the legacy name", async function () {
      for (const value of ["|", "abcd", "\r\n"]) {
        const legacy = await callback({ ...base, row_delimiter: value });
        const canonical = await callback({ ...base, record_delimiter: value });
        canonical.should.eql(legacy);
      }
    });

    it("explicit value generates the same artifact in sync mode", function () {
      for (const value of ["|", "abcd", "\r\n"]) {
        generateSync({ ...base, record_delimiter: value }).should.eql(
          generateSync({ ...base, row_delimiter: value }),
        );
      }
    });

    it("explicit value generates the same artifact in camel case", async function () {
      for (const value of ["|", "abcd"]) {
        const legacy = await callback({ ...base, rowDelimiter: value });
        const canonical = await callback({ ...base, recordDelimiter: value });
        canonical.should.eql(legacy);
      }
    });

    it("the canonical name is wired to the generated output", async function () {
      const data = await callback({ ...base, record_delimiter: "abcd" });
      // Two records are separated by a single row delimiter.
      data.split("abcd").length.should.eql(2);
    });

    it("default `eof` follows the resolved delimiter", async function () {
      for (const name of ["row_delimiter", "record_delimiter"]) {
        const data = await callback({ ...base, [name]: "|", eof: true });
        data.endsWith("|").should.be.true();
      }
    });

    it("exposes the resolved value as `rowDelimiter`", function () {
      for (const name of [
        "row_delimiter",
        "rowDelimiter",
        "record_delimiter",
        "recordDelimiter",
      ]) {
        generate({ [name]: ";" }).options.rowDelimiter.should.eql(";");
      }
    });

    it("exposes the default value when no name is provided", function () {
      generate().options.rowDelimiter.should.eql("\n");
    });
  });

  describe("invalid values keep the legacy behaviour", function () {
    it("does not throw on values accepted by the legacy name", async function () {
      for (const value of ["", null, 123, ["a", "b"]]) {
        const legacy = await callback({ ...base, row_delimiter: value });
        const canonical = await callback({ ...base, record_delimiter: value });
        canonical.should.eql(legacy);
      }
    });

    it("empty string is not reported as an error", function (next) {
      generate({ ...base, record_delimiter: "" }, (err, data) => {
        if (err) return next(err);
        data.should.eql("OMH,ONKCHhJmjadoA,DGeACHiN,nnmiN,CGfDKB");
        next();
      });
    });
  });

  describe("precedence when multiple names are provided", function () {
    it("`record_delimiter` wins over `row_delimiter`", async function () {
      for (const options of [
        { ...base, row_delimiter: "|", record_delimiter: ";" },
        { ...base, record_delimiter: ";", row_delimiter: "|" },
      ]) {
        const data = await callback(options);
        data.split(";").length.should.eql(2);
        data.includes("|").should.be.false();
      }
    });

    it("snake case wins over camel case of the same family", async function () {
      (await callback({ ...base, rowDelimiter: "|", row_delimiter: ";" }))
        .split(";")
        .length.should.eql(2);
      (await callback({ ...base, recordDelimiter: "|", record_delimiter: ";" }))
        .split(";")
        .length.should.eql(2);
    });

    it("an undefined name is treated as not provided", async function () {
      const data = await callback({
        ...base,
        record_delimiter: undefined,
        row_delimiter: "|",
      });
      data.split("|").length.should.eql(2);
    });
  });
});
