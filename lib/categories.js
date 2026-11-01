// Hoofdcategorieën van Marktplaats (l1CategoryId). Deze lijst verandert vrijwel nooit;
// subcategorieën en kenmerken worden live opgehaald.
export const MAIN_CATEGORIES = [
  [1, 'Antiek en Kunst'], [31, 'Audio, Tv en Foto'], [91, "Auto's"], [2600, 'Auto-onderdelen'], [48, 'Auto diversen'],
  [201, 'Boeken'], [289, 'Caravans en Kamperen'], [1744, "Cd's en Dvd's"], [322, 'Computers en Software'],
  [378, 'Contacten en Berichten'], [1098, 'Diensten en Vakmensen'], [395, 'Dieren en Toebehoren'],
  [239, 'Doe-het-zelf en Verbouw'], [445, 'Fietsen en Brommers'], [1099, 'Hobby en Vrije tijd'],
  [504, 'Huis en Inrichting'], [1032, 'Huizen en Kamers'], [565, "Kinderen en Baby's"], [621, 'Kleding | Dames'],
  [1776, 'Kleding | Heren'], [678, 'Motoren'], [728, 'Muziek en Instrumenten'], [1784, 'Postzegels en Munten'],
  [1826, 'Sieraden, Tassen en Uiterlijk'], [356, 'Spelcomputers en Games'], [784, 'Sport en Fitness'],
  [820, 'Telecommunicatie'], [1984, 'Tickets en Kaartjes'], [1847, 'Tuin en Terras'], [167, 'Vacatures'],
  [856, 'Vakantie'], [895, 'Verzamelen'], [976, 'Watersport en Boten'], [537, 'Witgoed en Apparatuur'],
  [1085, 'Zakelijke goederen'], [428, 'Diversen'],
].map(([id, label]) => ({ id, label }));
