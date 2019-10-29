const parseAuthors = str => {
  let etAl = false;
  const etAlReg = /\,?\s*et al\.?$/;
  if (etAlReg.test(str)) {
    str = str.replace(etAlReg, '');
    etAl = true;
  }
  const authors = str.split(',').map(s => s.trim());
  if (etAl) authors.push('ET_AL');
  return authors;
};

export default parseAuthors;
