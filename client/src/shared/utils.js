export const getFontColor = (color) => {
  const hexToRgb = (hex) =>
    hex
      .replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (m, r, g, b) => "#" + r + r + g + g + b + b
      )
      .substring(1)
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16));

  const luminance = (r, g, b) => {
    let a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const contrast = (rgb1, rgb2) => {
    let lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
    let lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
    let brightest = Math.max(lum1, lum2);
    let darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const ratioWhite = contrast(hexToRgb(color), [255, 255, 255]);
  const ratioBlack = contrast(hexToRgb(color), [0, 0, 0]);

  return ratioWhite > ratioBlack ? "white" : "black";
};

export const colorShade = (col, amt) => {
  /**
   * source: https://stackoverflow.com/a/62640342
   */
  col = col.replace(/^#/, "");
  if (col.length === 3)
    col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];

  let [r, g, b] = col.match(/.{2}/g);
  [r, g, b] = [
    parseInt(r, 16) + amt,
    parseInt(g, 16) + amt,
    parseInt(b, 16) + amt,
  ];

  r = Math.max(Math.min(255, r), 0).toString(16);
  g = Math.max(Math.min(255, g), 0).toString(16);
  b = Math.max(Math.min(255, b), 0).toString(16);

  const rr = (r.length < 2 ? "0" : "") + r;
  const gg = (g.length < 2 ? "0" : "") + g;
  const bb = (b.length < 2 ? "0" : "") + b;

  return `#${rr}${gg}${bb}`;
};

export const getRandomColor = (seed) => {
  // https://stackoverflow.com/questions/31243892/random-fill-colors-in-chart-js
  var letters = "0123456789ABCDEF".split("");
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random(seed) * 16)];
  }
  return color;
};

export const readFile = (fileMeta, setData) => {
  let reader = new FileReader();
  reader.readAsText(fileMeta);
  reader.onload = () => {
    // Convert data into nodes and edges
    // const jsonData = JSON.parse(reader.result);

    // Get unique
    // console.log(jsonData);
    setData(JSON.parse(reader.result));

    console.log("Loaded data");
    reader.onloadend = () => {
      reader = new FileReader();
    };
  };
};

export const sortSubgraphs = (
  subgraphs,
  sortType = "alpha",
  sortDescending = true
) => {
  // Sorts subgraphs based on their name (alphabetically) or value
  switch (sortType) {
    case "alpha":
      return subgraphs.sort((a, b) =>
        sortDescending
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );

    case "degree":
      return subgraphs.sort((a, b) =>
        sortDescending ? a.value - b.value : b.value - a.value
      );
    case "errors":
      return subgraphs.sort((a, b) =>
        sortDescending ? a.errors - b.errors : b.errors - a.errors
      );
    case "suggestions":
      return subgraphs.sort((a, b) =>
        sortDescending
          ? a.suggestions - b.suggestions
          : b.suggestions - a.suggestions
      );

    default:
      return subgraphs;
  }
};
