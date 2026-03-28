/**
 * Downloads one image per spot from Wikimedia Commons (free, no API key needed)
 * Run: node download-spot-images.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Map spot names to Wikimedia image URLs
const spotImages = {
  'Taj Mahal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg',
  'Hawa Mahal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Hawa_Mahal%2C_Jaipur%2C_2022.jpg/600px-Hawa_Mahal%2C_Jaipur%2C_2022.jpg',
  'Amber Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Amer_fort_Jaipur.jpg/800px-Amer_fort_Jaipur.jpg',
  'Jaisalmer Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Jaisalmer_fort.jpg/800px-Jaisalmer_fort.jpg',
  'Mehrangarh Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Mehrangarh_Fort%2C_Jodhpur.jpg/800px-Mehrangarh_Fort%2C_Jodhpur.jpg',
  'Chittorgarh Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Chittorgarh-fort.jpg/800px-Chittorgarh-fort.jpg',
  'City Palace Jaipur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/City_palace_Jaipur.jpg/800px-City_palace_Jaipur.jpg',
  'Pushkar Lake': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Pushkar_Lake.jpg/800px-Pushkar_Lake.jpg',
  'Brahma Temple Pushkar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Brahma_Temple%2C_Pushkar.jpg/800px-Brahma_Temple%2C_Pushkar.jpg',
  'Dilwara Temples': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Dilwara_Temple.jpg/800px-Dilwara_Temple.jpg',
  'Mount Abu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Nakki_Lake_Mount_Abu.jpg/800px-Nakki_Lake_Mount_Abu.jpg',
  'Ranthambore National Park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Bengal_Tiger.jpg/800px-Bengal_Tiger.jpg',
  'Udaipur City Palace': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Udaipur_city_palace.jpg/800px-Udaipur_city_palace.jpg',
  'Lake Pichola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Lake_Pichola%2C_Udaipur.jpg/800px-Lake_Pichola%2C_Udaipur.jpg',
  'Jaipur Jantar Mantar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Jantar_Mantar%2C_Jaipur.jpg/800px-Jantar_Mantar%2C_Jaipur.jpg',
  'Bikaner Junagarh Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Junagarh_Fort_Bikaner.jpg/800px-Junagarh_Fort_Bikaner.jpg',
  'Thar Desert Sam Dunes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Sam_Sand_Dunes_Jaisalmer.jpg/800px-Sam_Sand_Dunes_Jaisalmer.jpg',
  'Eklingji Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Eklingji_Temple.jpg/800px-Eklingji_Temple.jpg',
  'Nathdwara Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Nathdwara_Temple.jpg/800px-Nathdwara_Temple.jpg',
  'Kumbhalgarh Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Kumbhalgarh_fort.jpg/800px-Kumbhalgarh_fort.jpg',
  'Athirappilly Falls': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Athirappilly_Waterfalls.jpg/800px-Athirappilly_Waterfalls.jpg',
  'Varkala Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Varkala_cliff_beach.jpg/800px-Varkala_cliff_beach.jpg',
  'Kovalam Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Kovalam_beach.jpg/800px-Kovalam_beach.jpg',
  'Alleppey Backwaters': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Houseboats_in_Alleppey.jpg/800px-Houseboats_in_Alleppey.jpg',
  'Munnar Tea Gardens': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Munnar_tea_gardens.jpg/800px-Munnar_tea_gardens.jpg',
  'Wayanad Wildlife Sanctuary': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Wayanad_wildlife_sanctuary.jpg/800px-Wayanad_wildlife_sanctuary.jpg',
  'Padmanabhaswamy Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Padmanabhaswamy_temple.jpg/800px-Padmanabhaswamy_temple.jpg',
  'Guruvayur Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Guruvayur_Temple.jpg/800px-Guruvayur_Temple.jpg',
  'Sabrimala Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Sabarimala_temple.jpg/800px-Sabarimala_temple.jpg',
  'Periyar Wildlife Sanctuary': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Periyar_Wildlife_Sanctuary.jpg/800px-Periyar_Wildlife_Sanctuary.jpg',
  'Bekal Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Bekal_Fort.jpg/800px-Bekal_Fort.jpg',
  'Cherai Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cherai_beach.jpg/800px-Cherai_beach.jpg',
  'Mysore Palace': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Mysore_Palace_in_Evening.jpg/800px-Mysore_Palace_in_Evening.jpg',
  'Hampi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Virupaksha_Temple%2C_Hampi.jpg/800px-Virupaksha_Temple%2C_Hampi.jpg',
  'Badami Caves': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Badami_cave_temples.jpg/800px-Badami_cave_temples.jpg',
  'Jog Falls': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Jog_falls_during_monsoon.jpg/800px-Jog_falls_during_monsoon.jpg',
  'Coorg Coffee Estates': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Coffee_plantation_in_Coorg.jpg/800px-Coffee_plantation_in_Coorg.jpg',
  'Dudhsagar Falls': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Dudhsagar_Falls%2C_Goa%2C_India.jpg/800px-Dudhsagar_Falls%2C_Goa%2C_India.jpg',
  'Netravati Peak': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Kudremukh_peak.jpg/800px-Kudremukh_peak.jpg',
  'Shivanasamudra Falls': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Gaganachukki_Falls.jpg/800px-Gaganachukki_Falls.jpg',
  'Murudeshwar Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Murudeshwar_Shiva_Statue.jpg/800px-Murudeshwar_Shiva_Statue.jpg',
  'Sringeri Sharada Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sringeri_temple.jpg/800px-Sringeri_temple.jpg',
  'Gokarna Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Om_Beach_Gokarna.jpg/800px-Om_Beach_Gokarna.jpg',
  'Virupaksha Temple Hampi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Virupaksha_Temple%2C_Hampi.jpg/800px-Virupaksha_Temple%2C_Hampi.jpg',
  'Pattadakal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Pattadakal_temples.jpg/800px-Pattadakal_temples.jpg',
  'Aihole': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Aihole_Durga_temple.jpg/800px-Aihole_Durga_temple.jpg',
  'Chikmagalur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Mullayanagiri_peak.jpg/800px-Mullayanagiri_peak.jpg',
  'Bandipur National Park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bandipur_Tiger_Reserve.jpg/800px-Bandipur_Tiger_Reserve.jpg',
  'Belur Halebidu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Hoysaleswara_temple.jpg/800px-Hoysaleswara_temple.jpg',
  'Udupi Krishna Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Udupi_Krishna_temple.jpg/800px-Udupi_Krishna_temple.jpg',
  'Dharmasthala Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Dharmasthala_temple.jpg/800px-Dharmasthala_temple.jpg',
  'Meenakshi Amman Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Meenakshi_Amman_Temple.jpg/800px-Meenakshi_Amman_Temple.jpg',
  'Meenakshi Temple Madurai': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Meenakshi_Amman_Temple.jpg/800px-Meenakshi_Amman_Temple.jpg',
  'Brihadeeswarar Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Thanjavur_Periya_Kovil_4.jpg/800px-Thanjavur_Periya_Kovil_4.jpg',
  'Marina Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Marina_Beach%2C_Chennai.jpg/800px-Marina_Beach%2C_Chennai.jpg',
  'Rameshwaram Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Rameshwaram_temple.jpg/800px-Rameshwaram_temple.jpg',
  'Mahabalipuram': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Shore_Temple_Mahabalipuram.jpg/800px-Shore_Temple_Mahabalipuram.jpg',
  'Ooty Nilgiris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Ooty_Lake.jpg/800px-Ooty_Lake.jpg',
  'Kodaikanal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Kodaikanal_Lake.jpg/800px-Kodaikanal_Lake.jpg',
  'Tiruchendur Murugan Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tiruchendur_temple.jpg/800px-Tiruchendur_temple.jpg',
  'Kapaleeshwarar Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Kapaleeswarar_temple.jpg/800px-Kapaleeswarar_temple.jpg',
  'Vivekananda Rock Memorial': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Vivekananda_Rock_Memorial.jpg/800px-Vivekananda_Rock_Memorial.jpg',
  'Gateway of India': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Gateway_of_India_2008.jpg/800px-Gateway_of_India_2008.jpg',
  'Ajanta Caves': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Ajanta_cave9.jpg/800px-Ajanta_cave9.jpg',
  'Ellora Caves': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Ellora_cave16.jpg/800px-Ellora_cave16.jpg',
  'Shirdi Sai Baba Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Shirdi_Sai_Baba_Temple.jpg/800px-Shirdi_Sai_Baba_Temple.jpg',
  'Trimbakeshwar Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Trimbakeshwar_temple.jpg/800px-Trimbakeshwar_temple.jpg',
  'Mahabaleshwar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Mahabaleshwar.jpg/800px-Mahabaleshwar.jpg',
  'Elephanta Caves': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Elephanta_Caves.jpg/800px-Elephanta_Caves.jpg',
  'Varanasi Ghats': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Varanasi_Ghats.jpg/800px-Varanasi_Ghats.jpg',
  'Varanasi Kashi Vishwanath': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Kashi_Vishwanath_Temple.jpg/800px-Kashi_Vishwanath_Temple.jpg',
  'Agra Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Agra_fort_image.jpg/800px-Agra_fort_image.jpg',
  'Fatehpur Sikri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Fatehpur_Sikri_Buland_Darwaza.jpg/800px-Fatehpur_Sikri_Buland_Darwaza.jpg',
  'Mathura Vrindavan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Vrindavan_temple.jpg/800px-Vrindavan_temple.jpg',
  'Allahabad Sangam': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Triveni_Sangam_Prayagraj.jpg/800px-Triveni_Sangam_Prayagraj.jpg',
  'Lucknow Bara Imambara': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Bara_Imambara.jpg/800px-Bara_Imambara.jpg',
  'Sarnath': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Dhamek_stupa_Sarnath.jpg/800px-Dhamek_stupa_Sarnath.jpg',
  'Ayodhya Ram Mandir': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Ram_temple_Ayodhya.jpg/800px-Ram_temple_Ayodhya.jpg',
  'Rohtang Pass': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Rohtang_Pass.jpg/800px-Rohtang_Pass.jpg',
  'Solang Valley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Solang_valley.jpg/800px-Solang_valley.jpg',
  'Spiti Valley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Key_Monastery_Spiti_Valley.jpg/800px-Key_Monastery_Spiti_Valley.jpg',
  'Dharamsala McLeod Ganj': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/McLeod_Ganj.jpg/800px-McLeod_Ganj.jpg',
  'Shimla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Shimla_cityscape.jpg/800px-Shimla_cityscape.jpg',
  'Key Monastery': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Key_Monastery_Spiti_Valley.jpg/800px-Key_Monastery_Spiti_Valley.jpg',
  'Valley of Flowers': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Valley_of_Flowers%2C_Uttarakhand.jpg/800px-Valley_of_Flowers%2C_Uttarakhand.jpg',
  'Kedarnath Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Kedarnath_Temple.jpg/800px-Kedarnath_Temple.jpg',
  'Badrinath Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Badrinath_Temple.jpg/800px-Badrinath_Temple.jpg',
  'Rishikesh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Rishikesh_Laxman_Jhula.jpg/800px-Rishikesh_Laxman_Jhula.jpg',
  'Haridwar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Haridwar_Ganga_Aarti.jpg/800px-Haridwar_Ganga_Aarti.jpg',
  'Nainital Lake': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Nainital_lake.jpg/800px-Nainital_lake.jpg',
  'Jim Corbett National Park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Bengal_Tiger.jpg/800px-Bengal_Tiger.jpg',
  'Mussoorie': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Mussoorie_hill_station.jpg/800px-Mussoorie_hill_station.jpg',
  'Calangute Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Calangute_beach_Goa.jpg/800px-Calangute_beach_Goa.jpg',
  'Palolem Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Palolem_beach_Goa.jpg/800px-Palolem_beach_Goa.jpg',
  'Baga Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Baga_Beach_Goa.jpg/800px-Baga_Beach_Goa.jpg',
  'Old Goa Churches': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Basilica_of_Bom_Jesus.jpg/800px-Basilica_of_Bom_Jesus.jpg',
  'Fort Aguada': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Fort_Aguada_Goa.jpg/800px-Fort_Aguada_Goa.jpg',
  'Somnath Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Somnath_temple_Prabhas_Patan.jpg/800px-Somnath_temple_Prabhas_Patan.jpg',
  'Dwarkadheesh Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Dwarkadhish_temple.jpg/800px-Dwarkadhish_temple.jpg',
  'Rann of Kutch': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Rann_of_Kutch.jpg/800px-Rann_of_Kutch.jpg',
  'Gir National Park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Asiatic_Lion.jpg/800px-Asiatic_Lion.jpg',
  'Rani Ki Vav': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Rani_ki_vav.jpg/800px-Rani_ki_vav.jpg',
  'Statue of Unity': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Statue_of_Unity_2019.jpg/600px-Statue_of_Unity_2019.jpg',
  'Sabarmati Ashram': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Sabarmati_Ashram.jpg/800px-Sabarmati_Ashram.jpg',
  'Palitana Temples': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Palitana_temples.jpg/800px-Palitana_temples.jpg',
  'Tirupati Balaji Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tirumala_temple.jpg/800px-Tirumala_temple.jpg',
  'Charminar Hyderabad': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Charminar_in_Hyderabad.jpg/800px-Charminar_in_Hyderabad.jpg',
  'Golconda Fort Hyderabad': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Golconda_fort_2.jpg/800px-Golconda_fort_2.jpg',
  'Araku Valley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Araku_valley.jpg/800px-Araku_valley.jpg',
  'Borra Caves': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Borra_Caves.jpg/800px-Borra_Caves.jpg',
  'Khajuraho Temples': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Khajuraho_temple.jpg/800px-Khajuraho_temple.jpg',
  'Sanchi Stupa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Sanchi_stupa.jpg/800px-Sanchi_stupa.jpg',
  'Mahakaleshwar Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Mahakaleshwar_Temple.jpg/800px-Mahakaleshwar_Temple.jpg',
  'Bandhavgarh National Park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Bengal_Tiger.jpg/800px-Bengal_Tiger.jpg',
  'Kanha National Park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Bengal_Tiger.jpg/800px-Bengal_Tiger.jpg',
  'Gwalior Fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Gwalior_Fort.jpg/800px-Gwalior_Fort.jpg',
  'Orchha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Orchha_cenotaphs.jpg/800px-Orchha_cenotaphs.jpg',
  'Jagannath Temple Puri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Jagannath_Temple%2C_Puri.jpg/800px-Jagannath_Temple%2C_Puri.jpg',
  'Puri Jagannath': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Jagannath_Temple%2C_Puri.jpg/800px-Jagannath_Temple%2C_Puri.jpg',
  'Konark Sun Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Konarka_Temple.jpg/800px-Konarka_Temple.jpg',
  'Lingaraj Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Lingaraja_Temple_Bhubaneswar.jpg/800px-Lingaraja_Temple_Bhubaneswar.jpg',
  'Chilika Lake': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Chilika_lake.jpg/800px-Chilika_lake.jpg',
  'Puri Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Puri_beach.jpg/800px-Puri_beach.jpg',
  'Victoria Memorial Kolkata': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Victoria_Memorial%2C_Kolkata.jpg/800px-Victoria_Memorial%2C_Kolkata.jpg',
  'Darjeeling': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Darjeeling_tea_garden.jpg/800px-Darjeeling_tea_garden.jpg',
  'Sundarbans': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Sundarban_Tiger.jpg/800px-Sundarban_Tiger.jpg',
  'Howrah Bridge': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Howrah_Bridge_at_Night.jpg/800px-Howrah_Bridge_at_Night.jpg',
  'Dakshineshwar Kali Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Dakshineswar_Kali_Temple.jpg/800px-Dakshineswar_Kali_Temple.jpg',
  'Golden Temple Amritsar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Golden_Temple%2C_Amritsar%2C_India_-_Aug_2019.jpg/800px-Golden_Temple%2C_Amritsar%2C_India_-_Aug_2019.jpg',
  'Jallianwala Bagh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Jallianwala_Bagh.jpg/800px-Jallianwala_Bagh.jpg',
  'Wagah Border': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Wagah_border.jpg/800px-Wagah_border.jpg',
  'Bodh Gaya': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mahabodhi_Temple_Bodh_Gaya.jpg/800px-Mahabodhi_Temple_Bodh_Gaya.jpg',
  'Mahabodhi Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mahabodhi_Temple_Bodh_Gaya.jpg/800px-Mahabodhi_Temple_Bodh_Gaya.jpg',
  'Nalanda University Ruins': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Nalanda_university_ruins.jpg/800px-Nalanda_university_ruins.jpg',
  'Kaziranga National Park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/One_Horned_Rhino_Kaziranga.jpg/800px-One_Horned_Rhino_Kaziranga.jpg',
  'Kamakhya Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Kamakhya_Temple.jpg/800px-Kamakhya_Temple.jpg',
  'Cherrapunji': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Nohkalikai_Falls.jpg/800px-Nohkalikai_Falls.jpg',
  'Shillong': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Shillong_city.jpg/800px-Shillong_city.jpg',
  'Pangong Lake': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Pangong_tso.jpg/800px-Pangong_tso.jpg',
  'Dal Lake Srinagar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Dal_Lake_Srinagar.jpg/800px-Dal_Lake_Srinagar.jpg',
  'Gulmarg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Gulmarg_ski_resort.jpg/800px-Gulmarg_ski_resort.jpg',
  'Vaishno Devi Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Vaishno_devi_mandir.jpg/800px-Vaishno_devi_mandir.jpg',
  'Amarnath Cave Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Amarnath_cave.jpg/800px-Amarnath_cave.jpg',
  'Nubra Valley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Nubra_Valley_camels.jpg/800px-Nubra_Valley_camels.jpg',
  'Radhanagar Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Radhanagar_Beach.jpg/800px-Radhanagar_Beach.jpg',
  'Cellular Jail Port Blair': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Cellular_Jail_Andaman.jpg/800px-Cellular_Jail_Andaman.jpg',
  'Akshardham Delhi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Akshardham_Delhi.jpg/800px-Akshardham_Delhi.jpg',
  'Red Fort Delhi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Red_Fort_in_Delhi.jpg/800px-Red_Fort_in_Delhi.jpg',
  'Qutub Minar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Qutb_Minar_2010.jpg/800px-Qutb_Minar_2010.jpg',
  'Ranganathaswamy Temple Srirangam': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Srirangam_temple.jpg/800px-Srirangam_temple.jpg',
  'Tiruvannamalai Arunachaleswarar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Arunachaleswarar_Temple.jpg/800px-Arunachaleswarar_Temple.jpg',
  'Mangeshi Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Mangeshi_temple_goa.jpg/800px-Mangeshi_temple_goa.jpg',
  'Omkareshwar Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Omkareshwar_temple.jpg/800px-Omkareshwar_temple.jpg',
  'Kukke Subramanya': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Kukke_Subramanya_temple.jpg/800px-Kukke_Subramanya_temple.jpg',
  'Kollur Mookambika': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mookambika_temple.jpg/800px-Mookambika_temple.jpg',
  'Srisailam Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Srisailam_temple.jpg/800px-Srisailam_temple.jpg',
};

// Fallback images by category
const fallbackImages = {
  'Temple': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Kedarnath_Temple.jpg/800px-Kedarnath_Temple.jpg',
  'Nature': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Munnar_tea_gardens.jpg/800px-Munnar_tea_gardens.jpg',
  'Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Varkala_cliff_beach.jpg/800px-Varkala_cliff_beach.jpg',
  'Historical': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Virupaksha_Temple%2C_Hampi.jpg/800px-Virupaksha_Temple%2C_Hampi.jpg',
  'Landmark': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg',
  'General': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Varanasi_Ghats.jpg/800px-Varanasi_Ghats.jpg',
};

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10000) {
      console.log(`⏭️  Already exists: ${filename}`);
      return resolve(filename);
    }
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'TouristSpotApp/1.0 (educational project)',
        'Accept': 'image/jpeg,image/*',
      },
      timeout: 30000,
    }, response => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(filePath); } catch(e) {}
        return downloadImage(response.headers.location, filename).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(filePath); } catch(e) {}
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(filePath).size;
        if (size < 5000) {
          fs.unlinkSync(filePath);
          return reject(new Error('File too small'));
        }
        console.log(`✅ Downloaded: ${filename} (${Math.round(size/1024)}KB)`);
        resolve(filename);
      });
    });
    request.on('error', err => {
      try { fs.unlinkSync(filePath); } catch(e) {}
      reject(err);
    });
    request.on('timeout', () => {
      request.destroy();
      try { fs.unlinkSync(filePath); } catch(e) {}
      reject(new Error('Timeout'));
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const spots = db.prepare('SELECT * FROM spots WHERE status = ?').all('approved');
  console.log(`\n📸 Processing ${spots.length} spots...\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const spot of spots) {
    // Check if already has a photo
    const existingPhoto = db.prepare(
      'SELECT id, filename FROM photos WHERE spot_id = ? AND status = ? LIMIT 1'
    ).get(spot.id, 'approved');

    if (existingPhoto) {
      const filePath = path.join(UPLOADS_DIR, existingPhoto.filename);
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10000) {
        console.log(`⏭️  Has photo: ${spot.name}`);
        skipped++;
        continue;
      }
    }

    const imageUrl = spotImages[spot.name] || fallbackImages[spot.category];
    if (!imageUrl) {
      console.log(`⚠️  No image for: ${spot.name}`);
      failed++;
      continue;
    }

    try {
      const filename = `spot_img_${spot.id}.jpg`;
      await downloadImage(imageUrl, filename);

      // Remove existing failed photo record if any
      if (existingPhoto) {
        db.prepare('DELETE FROM photos WHERE id = ?').run(existingPhoto.id);
      }

      // Add photo to database
      db.prepare(`
        INSERT INTO photos (id, spot_id, user_id, filename, status, uploaded_at)
        VALUES (?, ?, 'system', ?, 'approved', ?)
      `).run(uuidv4(), spot.id, filename, Date.now());

      downloaded++;
      await sleep(300); // Be polite to Wikimedia servers
    } catch (e) {
      console.log(`❌ Failed: ${spot.name} - ${e.message}`);
      // Try fallback
      try {
        const fallbackUrl = fallbackImages[spot.category];
        if (fallbackUrl && fallbackUrl !== spotImages[spot.name]) {
          const filename = `spot_img_${spot.id}.jpg`;
          await downloadImage(fallbackUrl, filename);
          db.prepare(`
            INSERT OR REPLACE INTO photos (id, spot_id, user_id, filename, status, uploaded_at)
            VALUES (?, ?, 'system', ?, 'approved', ?)
          `).run(uuidv4(), spot.id, filename, Date.now());
          downloaded++;
          console.log(`✅ Used fallback for: ${spot.name}`);
        }
      } catch(e2) {
        failed++;
      }
    }
  }

  console.log(`\n🎉 Done!`);
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`⏭️  Skipped (already had): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total photos: ${db.prepare('SELECT COUNT(*) as c FROM photos WHERE status = ?').get('approved').c}`);
  process.exit(0);
}

main();
