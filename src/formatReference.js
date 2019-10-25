import Handlebars from 'handlebars';

const formatReference = (refData, style) => {
  const template = Handlebars.compile(style);
  return template(refData);
};

export default formatReference;
