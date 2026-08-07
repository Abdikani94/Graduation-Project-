import { sendJson } from '../lib/http.js';
import { secondarySchoolNames } from '../data/secondarySchools.js';

export const listSecondarySchools = (_req, res) => {
  sendJson(res, 200, { data: secondarySchoolNames });
};

export const somaliaDistricts = [
  'Abdiaziz', 'Adado', 'Adan Yabal', 'Afgooye', 'Afmadow', 'Afgooye', 'Afweyne',
  'Alula', 'Badhan', 'Baki', 'Balcad', 'Bandarbeyla', 'Baraawe', 'Bardera',
  'Beled Hawo', 'Beledweyne', 'Berbera', 'Borama', 'Bosaaso', 'Bondhere',
  'Bulo Burte', 'Burco', 'Burtinle', 'Buur Hakaba', 'Buur Gaabo', 'Buuhoodle',
  'Cabudwaaq', 'Cadale', 'Caynabo', 'Ceel Afweyn', 'Ceel Barde', 'Ceel Buur',
  'Ceel Dheer', 'Ceel Waaq', 'Dahar', 'Danwadaag', 'Daynile', 'Dharkenley',
  'Dhuusamareeb', 'Diinsoor', 'Doolow', 'Eyl', 'Galdogob', 'Garbahaarey',
  'Garoowe', 'Gebiley', 'Hamar Jajab', 'Hamar Weyne', 'Hargeysa', 'Hawle Wadag',
  'Hobyo', 'Hodan', 'Huriwaa', 'Iskushuban', 'Jalalaqsi', 'Jamaame', 'Jariiban',
  'Jilib', 'Jowhar', 'Kahda', 'Karaan', 'Kismayo', 'Laas Caanood', 'Laasqoray',
  'Lughaye', 'Luuq', 'Marka', 'Matabaan', 'Oodweyne', 'Qandala', 'Qardho',
  'Qoryooley', 'Rab Dhuure', 'Runirgod', 'Saakow', 'Sablaale', 'Shangaani',
  'Sheikh', 'Shibis', 'Taleex', 'Tayeeglow', 'Waaberi', 'Waajid', 'Wadajir',
  'Wanlaweyn', 'Warda Nabadda', 'Xarardheere', 'Xudun', 'Yaaqshiid', 'Zeylac'
].filter((district, index, values) => values.indexOf(district) === index)
  .sort((first, second) => first.localeCompare(second));

export const listSomaliaDistricts = (_req, res) => {
  sendJson(res, 200, { data: somaliaDistricts });
};
