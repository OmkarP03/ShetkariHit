"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { parseDate, prepareSourceRows, aggregateDaily } = require("../src/core");
test("dates are parsed without day/month ambiguity", () => { assert.equal(parseDate("10/2/2026").toISOString().slice(0,10), "2026-10-02"); assert.equal(parseDate("2026-10-02").toISOString().slice(0,10), "2026-10-02"); });
test("invalid and inconsistent prices are rejected", () => { const result=prepareSourceRows([{date:"2026-10-20",district:"Akola",market:"APMC Akola",variety:"Desi",min_price:8000,max_price:9000,modal_price:7000}]); assert.equal(result.accepted.length,0); assert.match(result.rejected[0].reason,/price order/); });
test("same-day records aggregate using arrivals weights", () => { const base={date:"2026-10-20",dateMs:parseDate("2026-10-20").getTime(),district:"Akola",market:"APMC Akola",variety:"Desi",min_price:7000,max_price:9000,actual_rain_mm:0,source:"test",verified:"1"}; const rows=aggregateDaily([{...base,modal_price:8000,arrivals_tonnes:1},{...base,modal_price:9000,arrivals_tonnes:3}]); assert.equal(rows.length,1); assert.equal(rows[0].modal_price,8750); });
