exports.dcf = function dcfLocal(inObject) {
    let outObject, value, key;

    if (typeof inObject !== 'object' || inObject === null) {
        return inObject; // Return the value if inObject is not an object
    }

    // Create an array or object to hold the values
    outObject = Array.isArray(inObject) ? [] : {};

    for (key in inObject) {
        value = inObject[key];

        // Recursively (deep) copy for nested objects, including arrays
        outObject[key] = typeof value === 'object' && value !== null ? dcfLocal(value) : value;
    }

    return outObject;
};

// create STRING TABLE from 2d ARRAY
exports.makeTable = (arr, crypt) => {
    let table = `<strong>${crypt}</strong>\n<pre>`;

    // identifying the longest cell in each column
    let spaceLengths = [];
    for (let i in arr[0]) spaceLengths.push(0);

    for (let i in arr) {
        for (let j in i) {
            if (spaceLengths[j] < arr[i][j]) spaceLengths[j] = arr[i][j];
        }
    }

    for (let row in arr) {
        for (let cell in arr[row]) {
            table += ` | ${arr[row][cell]}`;

            const cellLength = JSON.stringify(arr[row][cell]).length;
            for (let k = 0; k <= spaceLengths - cellLength; k++) {
                table += ' ';
            }
        }
        table += '|\n';
    }
    table += '</pre>';

    return table;
};

// make 2d ARRAY from OBJECT
exports.formatForTable = (str, fiats) => {
    const arr = Object.entries(str);
    const filtered = arr.filter((el) => fiats.includes(el[0]));

    for (let row in filtered) {
        for (let el in filtered[row]) {
            if (!isNaN(filtered[row][el] * 1)) {
                filtered[row][el] = Math.round(filtered[row][el] * 10000) / 10000;
            }
        }
    }

    return filtered;
};

// merge current and table values to make difference table
exports.mergeDiffTable = (curr, prev) => {
    let merged = [];

    let value, percent;
    for (let i in curr) {
        merged.push(new Array());

        value = Math.round((curr[i][1] - prev[i][1]) * 10000) / 10000;
        percent = `${Math.round(((curr[i][1] - prev[i][1]) / prev[i][1]) * 10000) / 100}%`; // round to 4 digits after dot
        merged[i].push(curr[i][0], curr[i][1], value, percent);
    }

    return merged;
};

// Converts Number values to financial format
function toFinanceFormat(num) {
    const str = JSON.stringify(num).split('.');

    let out = '';
    const spacePos = str[0].length % 3;
    for (let i in str[0]) {
        if (i % 3 === spacePos && i != 0) {
            out += ' ';
        }
        out += str[0][i];
    }
    out += `.${str[1]}`;
    return out;
}
