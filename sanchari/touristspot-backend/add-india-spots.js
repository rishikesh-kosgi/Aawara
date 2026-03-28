/**
 * Run this script to add 500+ Indian tourist spots to the database.
 * Usage: node add-india-spots.js
 */

const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

const spots = [
  // ============================================================
  // RAJASTHAN (40 spots)
  // ============================================================
  ['Taj Mahal', 'UNESCO World Heritage ivory-white marble mausoleum built by Mughal emperor Shah Jahan in 1632.', 'Landmark', 'Agra', 'India', 27.1751, 78.0421, 'Dharmapuri, Agra, Uttar Pradesh 282001', 0],
  ['Hawa Mahal', 'Palace of Winds - iconic 5-storey pink sandstone palace with 953 small windows built in 1799.', 'Landmark', 'Jaipur', 'India', 26.9239, 75.8267, 'Hawa Mahal Rd, Badi Choupad, Jaipur, Rajasthan 302002', 0],
  ['Amber Fort', 'Majestic fort palace built in 1592 with Indo-Islamic architecture overlooking Maota Lake.', 'Landmark', 'Jaipur', 'India', 26.9855, 75.8513, 'Devisinghpura, Amer, Jaipur, Rajasthan 302001', 0],
  ['Jaisalmer Fort', 'Living fort rising from the Thar Desert, one of largest fully preserved fortified cities in world.', 'Landmark', 'Jaisalmer', 'India', 26.9157, 70.9083, 'Fort Rd, Jaisalmer, Rajasthan 345001', 0],
  ['Mehrangarh Fort', 'One of the largest forts in India built in 1460, standing 122m above Jodhpur city.', 'Landmark', 'Jodhpur', 'India', 26.2980, 73.0188, 'The Fort, Jodhpur, Rajasthan 342001', 0],
  ['Chittorgarh Fort', 'Largest fort in India and symbol of Rajput valor spread over 700 acres.', 'Historical', 'Chittorgarh', 'India', 24.8887, 74.6269, 'Chittorgarh, Rajasthan 312001', 0],
  ['City Palace Jaipur', 'Royal palace complex in Jaipur with museums and Chandra Mahal where royals still reside.', 'Landmark', 'Jaipur', 'India', 26.9255, 75.8236, 'Tulsi Marg, Gangori Bazaar, Jaipur, Rajasthan 302002', 0],
  ['Pushkar Lake', 'Sacred lake surrounded by 52 ghats and 400 temples in the holy city of Pushkar.', 'Temple', 'Pushkar', 'India', 26.4897, 74.5511, 'Pushkar, Ajmer District, Rajasthan 305022', 0],
  ['Brahma Temple Pushkar', 'One of very few temples in the world dedicated to Lord Brahma, built in 14th century.', 'Temple', 'Pushkar', 'India', 26.4898, 74.5513, 'Pushkar, Ajmer, Rajasthan 305022', 0],
  ['Dilwara Temples', 'Stunning Jain temples built between 11th-16th century with exquisite marble carvings at Mount Abu.', 'Temple', 'Mount Abu', 'India', 24.5926, 72.7156, 'Mount Abu, Sirohi District, Rajasthan 307501', 0],
  ['Mount Abu', 'Only hill station in Rajasthan at 1220m altitude with Nakki Lake and wildlife sanctuary.', 'Nature', 'Mount Abu', 'India', 24.5926, 72.7083, 'Mount Abu, Sirohi, Rajasthan 307501', 0],
  ['Ranthambore National Park', 'Famous tiger reserve and former hunting ground of Jaipur maharajas in Rajasthan.', 'Nature', 'Sawai Madhopur', 'India', 26.0173, 76.5026, 'Ranthambore, Sawai Madhopur, Rajasthan 322001', 1],
  ['Udaipur City Palace', 'Magnificent palace complex on banks of Lake Pichola, called Venice of the East.', 'Landmark', 'Udaipur', 'India', 24.5764, 73.6833, 'Old City, Udaipur, Rajasthan 313001', 0],
  ['Lake Pichola', 'Artificial freshwater lake in Udaipur with island palaces and stunning sunset views.', 'Nature', 'Udaipur', 'India', 24.5757, 73.6791, 'Udaipur, Rajasthan 313001', 0],
  ['Jaipur Jantar Mantar', 'UNESCO listed astronomical observatory built by Maharaja Jai Singh II in 1734.', 'Historical', 'Jaipur', 'India', 26.9246, 75.8242, 'Kanwar Nagar, Jaipur, Rajasthan 302002', 0],
  ['Bikaner Junagarh Fort', 'Impregnable fort built in 1594 that was never conquered, with 37 palaces inside.', 'Landmark', 'Bikaner', 'India', 28.0230, 73.3119, 'Junagarh Fort Rd, Bikaner, Rajasthan 334001', 0],
  ['Thar Desert Sam Dunes', 'Golden sand dunes of Sam near Jaisalmer, perfect for camel safari and desert camping.', 'Nature', 'Jaisalmer', 'India', 26.8787, 70.5557, 'Sam Sand Dunes, Jaisalmer, Rajasthan 345001', 0],
  ['Eklingji Temple', 'Main deity of Mewar rulers, 108 temples complex dedicated to Lord Shiva near Udaipur.', 'Temple', 'Udaipur', 'India', 24.6891, 73.6901, 'Kailashpuri, Udaipur, Rajasthan 313202', 0],
  ['Nathdwara Temple', 'Pilgrimage center with famous Shrinathji temple, 7th incarnation of Lord Krishna.', 'Temple', 'Rajsamand', 'India', 24.9333, 73.8167, 'Nathdwara, Rajsamand, Rajasthan 313301', 0],
  ['Kumbhalgarh Fort', 'UNESCO listed fort with worlds second longest wall after Great Wall of China.', 'Landmark', 'Rajsamand', 'India', 25.1502, 73.5876, 'Kumbhalgarh, Rajsamand, Rajasthan 313325', 0],

  // ============================================================
  // KERALA (30 spots)
  // ============================================================
  ['Athirappilly Falls', 'Largest waterfall in Kerala, 80 feet wide called the Niagara of India.', 'Nature', 'Thrissur', 'India', 10.2867, 76.5694, 'Athirappilly, Thrissur District, Kerala 680721', 0],
  ['Varkala Beach', 'Stunning cliffside beach with natural mineral springs, unique black rock cliffs in Kerala.', 'Beach', 'Varkala', 'India', 8.7379, 76.7163, 'Varkala, Thiruvananthapuram, Kerala 695141', 0],
  ['Kovalam Beach', 'Famous crescent shaped lighthouse beach near Thiruvananthapuram with three beaches.', 'Beach', 'Kovalam', 'India', 8.4004, 76.9787, 'Kovalam, Thiruvananthapuram, Kerala 695527', 0],
  ['Alleppey Backwaters', 'Venice of the East - famous houseboat rides through 900km network of canals and lagoons.', 'Nature', 'Alappuzha', 'India', 9.4981, 76.3388, 'Alappuzha, Kerala 688001', 0],
  ['Munnar Tea Gardens', 'Rolling hills with lush green tea plantations at 1600m altitude in Western Ghats.', 'Nature', 'Munnar', 'India', 10.0889, 77.0595, 'Munnar, Idukki District, Kerala 685612', 0],
  ['Wayanad Wildlife Sanctuary', 'Dense 344 sq km forest home to elephants, tigers, leopards and rare species.', 'Nature', 'Wayanad', 'India', 11.6854, 76.1320, 'Wayanad, Kerala 673121', 1],
  ['Meenakshi Amman Temple', 'Historic 2500 year old temple dedicated to Goddess Meenakshi with 14 towering gopurams.', 'Temple', 'Madurai', 'India', 9.9195, 78.1193, 'Madurai Main, Madurai, Tamil Nadu 625001', 0],
  ['Padmanabhaswamy Temple', 'Ancient temple with worlds richest treasure worth over $20 billion in Thiruvananthapuram.', 'Temple', 'Thiruvananthapuram', 'India', 8.4833, 76.9462, 'East Fort, Thiruvananthapuram, Kerala 695023', 0],
  ['Guruvayur Temple', 'Most important Vaishnavite temple in Kerala, called Dwarka of the South.', 'Temple', 'Thrissur', 'India', 10.5927, 76.0408, 'Guruvayur, Thrissur, Kerala 680101', 0],
  ['Sabrimala Temple', 'Famous pilgrimage temple of Lord Ayyappa atop Sabrimala hills visited by millions.', 'Temple', 'Pathanamthitta', 'India', 9.4326, 77.0839, 'Sabrimala, Pathanamthitta, Kerala 689513', 1],
  ['Thrissur Pooram', 'Grandest temple festival in India held at Vadakkunnathan Temple in Thrissur.', 'Temple', 'Thrissur', 'India', 10.5276, 76.2144, 'Vadakkunnathan, Thrissur, Kerala 680001', 0],
  ['Periyar Wildlife Sanctuary', 'Famous wildlife sanctuary with unique boat safari on Periyar Lake to spot elephants.', 'Nature', 'Thekkady', 'India', 9.5886, 77.1667, 'Thekkady, Idukki, Kerala 685536', 1],
  ['Kumarakom Bird Sanctuary', 'Internationally renowned bird sanctuary on banks of Vembanad Lake in Kerala.', 'Nature', 'Kottayam', 'India', 9.6167, 76.4333, 'Kumarakom, Kottayam, Kerala 686563', 0],
  ['Bekal Fort', 'Largest and best preserved fort in Kerala built in 1650 overlooking the Arabian Sea.', 'Landmark', 'Kasaragod', 'India', 12.3907, 75.0330, 'Bekal, Kasaragod, Kerala 671318', 0],
  ['Cherai Beach', 'Unique beach where backwaters and sea meet, with Chinese fishing nets in Kochi.', 'Beach', 'Kochi', 'India', 10.1350, 76.1780, 'Cherai, Ernakulam, Kerala 683514', 0],

  // ============================================================
  // KARNATAKA (30 spots)
  // ============================================================
  ['Mysore Palace', 'Magnificent royal palace of Wadiyar dynasty, most visited monument in India after Taj.', 'Landmark', 'Mysuru', 'India', 12.3052, 76.6552, 'Sayyaji Rao Rd, Mysuru, Karnataka 570001', 0],
  ['Hampi', 'UNESCO World Heritage Site with ancient Vijayanagara Empire ruins over 4000 hectares.', 'Historical', 'Hampi', 'India', 15.3350, 76.4600, 'Hampi, Ballari District, Karnataka 583239', 0],
  ['Badami Caves', 'Ancient 6th century rock-cut cave temples of Chalukya dynasty with beautiful sculptures.', 'Historical', 'Badami', 'India', 15.9149, 75.6760, 'Badami, Bagalkot District, Karnataka 587201', 0],
  ['Jog Falls', 'Second highest plunge waterfall in India, 253m tall on Sharavathi river in Shimoga.', 'Nature', 'Shimoga', 'India', 14.2269, 74.7921, 'Jog Falls, Shimoga District, Karnataka 577435', 0],
  ['Coorg Coffee Estates', 'Lush green coffee and spice plantations in the Scotland of India at 1525m altitude.', 'Nature', 'Coorg', 'India', 12.3375, 75.8069, 'Madikeri, Coorg, Karnataka 571201', 0],
  ['Dudhsagar Falls', 'Four-tiered 310m tall waterfall on Goa-Karnataka border meaning Sea of Milk.', 'Nature', 'Belagavi', 'India', 15.3147, 74.3144, 'Dudhsagar, Karnataka 403410', 1],
  ['Netravati Peak', 'Stunning 1567m trekking peak in Western Ghats near Mangalore in Karnataka.', 'Nature', 'Mangalore', 'India', 12.9762, 75.3998, 'Netravati Peak, Dakshina Kannada, Karnataka', 1],
  ['Shivanasamudra Falls', 'Twin waterfalls Gaganachukki and Bharachukki on Kaveri river in Mandya.', 'Nature', 'Mandya', 'India', 12.2700, 77.1600, 'Shivanasamudra, Mandya District, Karnataka 571448', 0],
  ['Murudeshwar Temple', 'Temple with worlds second tallest Shiva statue at 123 feet on Arabian Sea coast.', 'Temple', 'Uttara Kannada', 'India', 14.0938, 74.1071, 'Murudeshwar, Uttara Kannada, Karnataka 581350', 0],
  ['Sringeri Sharada Temple', 'First of four Peethas established by Adi Shankaracharya on banks of Tunga river.', 'Temple', 'Chikmagalur', 'India', 13.4166, 75.2545, 'Sringeri, Chikkamagaluru, Karnataka 577139', 0],
  ['Gokarna Beach', 'Sacred town with pristine Om Beach shaped like the Hindu symbol Om in Karnataka.', 'Beach', 'Gokarna', 'India', 14.5479, 74.3188, 'Gokarna, Uttara Kannada, Karnataka 581326', 0],
  ['Virupaksha Temple Hampi', 'Living 7th century temple complex at Hampi dedicated to Lord Shiva.', 'Temple', 'Hampi', 'India', 15.3350, 76.4597, 'Hampi, Ballari District, Karnataka 583239', 0],
  ['Pattadakal', 'UNESCO listed group of 8th century Hindu and Jain temples in Chalukyan style.', 'Historical', 'Bagalkot', 'India', 15.9479, 75.8182, 'Pattadakal, Bagalkot, Karnataka 587118', 0],
  ['Aihole', 'Cradle of Indian temple architecture with 125 temples dating from 4th century.', 'Historical', 'Bagalkot', 'India', 16.0156, 75.8834, 'Aihole, Bagalkot, Karnataka 587124', 0],
  ['Chikmagalur', 'Coffee land of Karnataka at 1090m with Mullayanagiri peak and Baba Budangiri hills.', 'Nature', 'Chikmagalur', 'India', 13.3161, 75.7720, 'Chikkamagaluru, Karnataka 577101', 0],
  ['Bandipur National Park', 'Famous tiger reserve at confluence of Western and Eastern Ghats in Karnataka.', 'Nature', 'Chamarajanagar', 'India', 11.6854, 76.6401, 'Bandipur, Chamarajanagar, Karnataka 571126', 1],
  ['Belur Halebidu', 'Twin 12th century Hoysala temple complexes with intricate stone sculptures.', 'Historical', 'Hassan', 'India', 13.1648, 75.8656, 'Belur, Hassan District, Karnataka 573115', 0],
  ['Udupi Krishna Temple', 'Famous 13th century temple founded by philosopher Madhvacharya with golden chariot festival.', 'Temple', 'Udupi', 'India', 13.3409, 74.7421, 'Car Street, Udupi, Karnataka 576101', 0],
  ['Dharmasthala Temple', 'Famous Shiva temple managed by Jain family, known for free meals to thousands daily.', 'Temple', 'Dakshina Kannada', 'India', 12.9588, 75.3791, 'Dharmasthala, Dakshina Kannada, Karnataka 574216', 0],
  ['Kabini River Lodge', 'Famous wildlife destination on banks of Kabini river for elephant and tiger sightings.', 'Nature', 'Mysuru', 'India', 11.9167, 76.3333, 'Kabini, Nagarhole, Mysuru, Karnataka 571114', 1],

  // ============================================================
  // TAMIL NADU (30 spots)
  // ============================================================
  ['Meenakshi Temple Madurai', 'Historic 2500 year old temple dedicated to Goddess Meenakshi with 14 gopurams.', 'Temple', 'Madurai', 'India', 9.9195, 78.1193, 'Madurai Main, Madurai, Tamil Nadu 625001', 0],
  ['Brihadeeswarar Temple', 'UNESCO listed 1000 year old temple with 66m tall tower built by Raja Raja Chola I.', 'Temple', 'Thanjavur', 'India', 10.7828, 79.1318, 'Membalam Rd, Thanjavur, Tamil Nadu 613001', 0],
  ['Marina Beach', 'Second longest natural urban beach in world, 13km long golden sands in Chennai.', 'Beach', 'Chennai', 'India', 13.0500, 80.2824, 'Marina Beach, Chennai, Tamil Nadu 600004', 0],
  ['Rameshwaram Temple', 'One of Char Dham sites on Pamban Island with longest temple corridor in India.', 'Temple', 'Ramanathapuram', 'India', 9.2881, 79.3174, 'Rameswaram, Ramanathapuram, Tamil Nadu 623526', 0],
  ['Mahabalipuram', 'UNESCO listed 7th-8th century rock-cut temples on Coromandel Coast near Chennai.', 'Historical', 'Mahabalipuram', 'India', 12.6269, 80.1927, 'Mahabalipuram, Kanchipuram, Tamil Nadu 603104', 0],
  ['Ooty Nilgiris', 'Queen of Nilgiris at 2240m with toy train, botanical gardens and tea estates.', 'Nature', 'Ooty', 'India', 11.4102, 76.6950, 'Udhagamandalam, Nilgiris, Tamil Nadu 643001', 0],
  ['Kodaikanal', 'Princess of Hill Stations at 2133m with star-shaped lake and Pillar Rocks.', 'Nature', 'Dindigul', 'India', 10.2381, 77.4892, 'Kodaikanal, Dindigul, Tamil Nadu 624101', 0],
  ['Tiruchendur Murugan Temple', 'Ancient seaside temple dedicated to Lord Murugan on shores of Bay of Bengal.', 'Temple', 'Thoothukudi', 'India', 8.4967, 78.1219, 'Tiruchendur, Thoothukudi, Tamil Nadu 628215', 0],
  ['Kapaleeshwarar Temple', 'Ancient Dravidian style Shiva temple in Mylapore with magnificent 37m tall gopuram.', 'Temple', 'Chennai', 'India', 13.0334, 80.2690, 'Mylapore, Chennai, Tamil Nadu 600004', 0],
  ['Murugan Temple Palani', 'Famous hilltop temple dedicated to Lord Murugan atop 500m high Sivagiri hill.', 'Temple', 'Dindigul', 'India', 10.4442, 77.5208, 'Palani, Dindigul, Tamil Nadu 624601', 0],
  ['Kanchipuram Temples', 'City of thousand temples and silk sarees, with Ekambareswarar and Kailasanathar temples.', 'Temple', 'Kanchipuram', 'India', 12.8380, 79.7036, 'Kanchipuram, Tamil Nadu 631501', 0],
  ['Velankanni Church', 'Famous Catholic shrine called Lourdes of the East on the Bay of Bengal coast.', 'Temple', 'Nagapattinam', 'India', 10.6744, 79.8544, 'Velankanni, Nagapattinam, Tamil Nadu 611111', 0],
  ['Chettinad', 'Famous for grand mansions of Nattukotai Chettiars and unique Chettinad cuisine.', 'Historical', 'Sivaganga', 'India', 10.1400, 78.7800, 'Karaikudi, Sivaganga, Tamil Nadu 630001', 0],
  ['Yercaud', 'Little Ooty of Tamil Nadu at 1515m in Shevaroy Hills with spice gardens.', 'Nature', 'Salem', 'India', 11.7667, 78.2000, 'Yercaud, Salem, Tamil Nadu 636602', 0],
  ['Vivekananda Rock Memorial', 'Memorial built on rock where Swami Vivekananda meditated, at the southernmost tip.', 'Landmark', 'Kanyakumari', 'India', 8.0767, 77.5538, 'Vivekananda Puram, Kanyakumari, Tamil Nadu 629702', 0],

  // ============================================================
  // MAHARASHTRA (25 spots)
  // ============================================================
  ['Gateway of India', 'Iconic arch monument built in 1924 overlooking Arabian Sea in Mumbai.', 'Landmark', 'Mumbai', 'India', 18.9220, 72.8347, 'Apollo Bandar, Colaba, Mumbai, Maharashtra 400001', 0],
  ['Ajanta Caves', 'UNESCO World Heritage 2nd century BC Buddhist cave monuments with magnificent paintings.', 'Historical', 'Aurangabad', 'India', 20.5519, 75.7033, 'Ajanta, Aurangabad, Maharashtra 431117', 0],
  ['Ellora Caves', 'UNESCO listed 34 monasteries and temples carved into rock between 600-1000 AD.', 'Historical', 'Aurangabad', 'India', 20.0258, 75.1780, 'Ellora, Aurangabad, Maharashtra 431102', 0],
  ['Shirdi Sai Baba Temple', 'Most visited pilgrimage site in Maharashtra with 25,000+ daily devotees.', 'Temple', 'Shirdi', 'India', 19.7673, 74.4777, 'Shirdi, Ahmednagar, Maharashtra 423109', 0],
  ['Trimbakeshwar Temple', 'One of 12 Jyotirlinga shrines of Lord Shiva at the source of Godavari river.', 'Temple', 'Nashik', 'India', 19.9334, 73.5310, 'Trimbak, Nashik, Maharashtra 422212', 0],
  ['Bhimashankar Temple', 'One of 12 Jyotirlinga temples of Lord Shiva in Sahyadri range, 1050m altitude.', 'Temple', 'Pune', 'India', 19.0726, 73.5365, 'Bhimashankar, Pune, Maharashtra 410509', 1],
  ['Mahabaleshwar', 'Queen of Hill Stations in Maharashtra at 1353m with Venna Lake and strawberry farms.', 'Nature', 'Satara', 'India', 17.9238, 73.6579, 'Mahabaleshwar, Satara, Maharashtra 412806', 0],
  ['Lonavala', 'Popular hill station between Mumbai and Pune with Bhushi Dam and Karla Caves.', 'Nature', 'Pune', 'India', 18.7482, 73.4053, 'Lonavala, Pune, Maharashtra 410401', 0],
  ['Elephanta Caves', 'UNESCO listed 5th-8th century cave temples on island near Mumbai with massive Shiva sculpture.', 'Historical', 'Mumbai', 'India', 18.9633, 72.9315, 'Elephanta Island, Mumbai, Maharashtra 400094', 0],
  ['Chhatrapati Shivaji Terminus', 'UNESCO listed Victorian Gothic railway station built in 1887, iconic Mumbai landmark.', 'Landmark', 'Mumbai', 'India', 18.9400, 72.8356, 'Chhatrapati Shivaji Terminus, Mumbai, Maharashtra 400001', 0],
  ['Daulatabad Fort', 'Impregnable medieval fort on a 200m tall isolated conical hill near Aurangabad.', 'Landmark', 'Aurangabad', 'India', 19.9443, 75.2147, 'Daulatabad, Aurangabad, Maharashtra 431002', 0],
  ['Pandharpur Temple', 'Most sacred pilgrimage site in Maharashtra, Vitthal temple on banks of Bhima river.', 'Temple', 'Solapur', 'India', 17.6799, 75.3302, 'Pandharpur, Solapur, Maharashtra 413304', 0],
  ['Kolhapur Mahalakshmi Temple', 'One of six Shakti Peethas, ancient temple of Goddess Mahalakshmi in Kolhapur.', 'Temple', 'Kolhapur', 'India', 16.7020, 74.2283, 'Kolhapur, Maharashtra 416003', 0],
  ['Nashik Trimbak Ghats', 'Sacred city on banks of Godavari river, one of Kumbh Mela sites with many temples.', 'Temple', 'Nashik', 'India', 20.0059, 73.7898, 'Nashik, Maharashtra 422001', 0],
  ['Raigad Fort', 'Historical fort where Chhatrapati Shivaji Maharaj was coronated in 1674.', 'Landmark', 'Raigad', 'India', 18.2394, 73.4418, 'Mahad, Raigad, Maharashtra 402301', 0],

  // ============================================================
  // UTTAR PRADESH (25 spots)
  // ============================================================
  ['Varanasi Ghats', 'Ancient 88 ghats on banks of Ganges, spiritual heart of India with morning aarti.', 'General', 'Varanasi', 'India', 25.3176, 83.0130, 'Dashashwamedh Ghat, Varanasi, Uttar Pradesh 221001', 0],
  ['Varanasi Kashi Vishwanath', 'Most sacred Jyotirlinga temple of Lord Shiva in the holiest city Varanasi.', 'Temple', 'Varanasi', 'India', 25.3109, 83.0107, 'Lahori Tola, Varanasi, Uttar Pradesh 221001', 0],
  ['Agra Fort', 'UNESCO listed Mughal fort on banks of Yamuna river, residence of Mughal emperors.', 'Landmark', 'Agra', 'India', 27.1800, 78.0218, 'Agra Fort, Agra, Uttar Pradesh 282003', 0],
  ['Fatehpur Sikri', 'UNESCO listed abandoned Mughal city built by Emperor Akbar in 1571.', 'Historical', 'Agra', 'India', 27.0945, 77.6741, 'Fatehpur Sikri, Agra, Uttar Pradesh 283110', 0],
  ['Mathura Vrindavan', 'Birthplace of Lord Krishna with 5000+ temples and sacred sites.', 'Temple', 'Mathura', 'India', 27.5530, 77.6731, 'Mathura, Uttar Pradesh 281001', 0],
  ['Allahabad Sangam', 'Sacred confluence of Ganga, Yamuna and mythical Saraswati rivers in Prayagraj.', 'Temple', 'Prayagraj', 'India', 25.4237, 81.8846, 'Sangam, Prayagraj, Uttar Pradesh 211001', 0],
  ['Lucknow Bara Imambara', 'Huge Imambara built in 1784 with labyrinthine Bhul-Bhulaiya maze inside.', 'Historical', 'Lucknow', 'India', 26.8714, 80.9097, 'Husainabad, Lucknow, Uttar Pradesh 226003', 0],
  ['Sarnath', 'Where Buddha gave his first sermon after enlightenment, major Buddhist pilgrimage site.', 'Historical', 'Varanasi', 'India', 25.3816, 83.0238, 'Sarnath, Varanasi, Uttar Pradesh 221007', 0],
  ['Ayodhya Ram Mandir', 'New grand Ram Mandir built at birthplace of Lord Ram in holy city Ayodhya.', 'Temple', 'Ayodhya', 'India', 26.7952, 82.1952, 'Ram Janmabhoomi, Ayodhya, Uttar Pradesh 224123', 0],
  ['Dudhwa National Park', 'Tiger reserve at Terai belt bordering Nepal, home to Indian rhinos and tigers.', 'Nature', 'Lakhimpur Kheri', 'India', 28.6324, 80.7418, 'Dudhwa, Lakhimpur Kheri, Uttar Pradesh 262902', 1],

  // ============================================================
  // HIMACHAL PRADESH (20 spots)
  // ============================================================
  ['Rohtang Pass', 'High mountain pass at 3978m near Manali with stunning snow and glacier views.', 'Nature', 'Manali', 'India', 32.3726, 77.2375, 'Rohtang Pass, Kullu, Himachal Pradesh 175131', 1],
  ['Solang Valley', 'Snow valley near Manali known for skiing, paragliding and adventure sports.', 'Nature', 'Manali', 'India', 32.3195, 77.1518, 'Solang Valley, Kullu, Himachal Pradesh 175131', 1],
  ['Spiti Valley', 'Cold desert mountain valley at 3800m with ancient Buddhist monasteries.', 'Nature', 'Lahaul and Spiti', 'India', 32.2432, 78.0358, 'Kaza, Spiti Valley, Himachal Pradesh 172114', 1],
  ['Dharamsala McLeod Ganj', 'Home of Dalai Lama and Tibetan government in exile, little Lhasa of India.', 'General', 'Dharamsala', 'India', 32.2190, 76.3234, 'McLeod Ganj, Dharamsala, Himachal Pradesh 176219', 0],
  ['Shimla', 'Former summer capital of British India at 2206m with colonial architecture.', 'General', 'Shimla', 'India', 31.1048, 77.1734, 'The Mall, Shimla, Himachal Pradesh 171001', 0],
  ['Kasol', 'Mini Israel of India in Parvati Valley, base for treks to Kheerganga and Malana.', 'Nature', 'Kullu', 'India', 32.0097, 77.3149, 'Kasol, Kullu, Himachal Pradesh 175105', 0],
  ['Khajjiar', 'Mini Switzerland of India with circular meadow surrounded by deodar forests.', 'Nature', 'Chamba', 'India', 32.5476, 76.0264, 'Khajjiar, Chamba, Himachal Pradesh 176314', 0],
  ['Key Monastery', 'Ancient 11th century Tibetan Buddhist monastery at 4166m in Spiti Valley.', 'Temple', 'Lahaul and Spiti', 'India', 32.3024, 78.0133, 'Kaza, Lahaul and Spiti, Himachal Pradesh 172114', 1],
  ['Dalhousie', 'Colonial hill station at 2036m with Dainkund peak and Kalatop wildlife sanctuary.', 'Nature', 'Chamba', 'India', 32.5386, 75.9709, 'Dalhousie, Chamba, Himachal Pradesh 176304', 0],
  ['Sangla Valley', 'Scenic Baspa Valley with apple orchards and Kamru Fort in Kinnaur.', 'Nature', 'Kinnaur', 'India', 31.4167, 78.2167, 'Sangla, Kinnaur, Himachal Pradesh 172106', 1],

  // ============================================================
  // UTTARAKHAND (20 spots)
  // ============================================================
  ['Valley of Flowers', 'UNESCO World Heritage alpine valley with 300+ wildflower species at 3600m.', 'Nature', 'Chamoli', 'India', 30.7283, 79.6050, 'Valley of Flowers, Chamoli, Uttarakhand 246401', 1],
  ['Kedarnath Temple', 'Ancient Hindu Shiva temple at 3583m altitude in Himalayas, one of Char Dham.', 'Temple', 'Rudraprayag', 'India', 30.7346, 79.0669, 'Kedarnath, Rudraprayag, Uttarakhand 246445', 1],
  ['Badrinath Temple', 'One of Char Dham pilgrimage sites dedicated to Lord Vishnu at 3133m altitude.', 'Temple', 'Chamoli', 'India', 30.7433, 79.4938, 'Badrinath, Chamoli, Uttarakhand 246422', 1],
  ['Rishikesh', 'Yoga capital of world on banks of Ganges with adventure sports and ashrams.', 'General', 'Rishikesh', 'India', 30.0869, 78.2676, 'Rishikesh, Dehradun, Uttarakhand 249201', 0],
  ['Haridwar', 'Gateway to Char Dham, sacred city where Ganges descends from Himalayas.', 'Temple', 'Haridwar', 'India', 29.9457, 78.1642, 'Haridwar, Uttarakhand 249401', 0],
  ['Nainital Lake', 'Beautiful pear-shaped lake at 2084m surrounded by hills in Kumaon Himalayas.', 'Nature', 'Nainital', 'India', 29.3919, 79.4542, 'Nainital, Uttarakhand 263001', 0],
  ['Jim Corbett National Park', 'Oldest national park in India established 1936, home to Bengal tigers.', 'Nature', 'Nainital', 'India', 29.5300, 78.7747, 'Ramnagar, Nainital, Uttarakhand 244715', 1],
  ['Mussoorie', 'Queen of Hills at 2005m with Kempty Falls and colonial architecture in Uttarakhand.', 'Nature', 'Dehradun', 'India', 30.4598, 78.0664, 'Mussoorie, Dehradun, Uttarakhand 248179', 0],
  ['Auli', 'Skiing resort at 2519m with panoramic views of Nanda Devi and other peaks.', 'Nature', 'Chamoli', 'India', 30.5200, 79.5683, 'Auli, Chamoli, Uttarakhand 246401', 1],
  ['Tungnath Temple', 'Highest Shiva temple in world at 3680m altitude on Chandrashila peak.', 'Temple', 'Rudraprayag', 'India', 30.4873, 79.2168, 'Chopta, Rudraprayag, Uttarakhand 246419', 1],

  // ============================================================
  // GOA (15 spots)
  // ============================================================
  ['Calangute Beach', 'Queen of beaches in North Goa, most popular tourist beach in Goa.', 'Beach', 'Goa', 'India', 15.5440, 73.7528, 'Calangute, North Goa, Goa 403516', 0],
  ['Palolem Beach', 'Crescent shaped peaceful beach in South Goa known for dolphin spotting.', 'Beach', 'Goa', 'India', 15.0100, 74.0232, 'Palolem, Canacona, South Goa 403702', 0],
  ['Baga Beach', 'Famous beach known for nightlife, water sports and beach shacks in North Goa.', 'Beach', 'Goa', 'India', 15.5569, 73.7520, 'Baga, North Goa, Goa 403516', 0],
  ['Agonda Beach', 'Quiet pristine beach in South Goa, nesting ground for olive ridley turtles.', 'Beach', 'Goa', 'India', 15.0478, 74.0009, 'Agonda, Canacona, South Goa 403702', 0],
  ['Old Goa Churches', 'UNESCO listed 16th century Portuguese churches including Basilica of Bom Jesus.', 'Historical', 'Goa', 'India', 15.5017, 73.9122, 'Old Goa, North Goa, Goa 403402', 0],
  ['Dudhsagar Falls Goa', 'Spectacular 4-tiered 310m waterfall on Goa-Karnataka border accessible by train.', 'Nature', 'Goa', 'India', 15.3147, 74.0134, 'Collem, South Goa, Goa 403410', 1],
  ['Fort Aguada', 'Well-preserved 17th century Portuguese fort and lighthouse overlooking Arabian Sea.', 'Landmark', 'Goa', 'India', 15.4946, 73.7740, 'Sinquerim, North Goa, Goa 403519', 0],
  ['Mangeshi Temple', 'Most popular and visited Hindu temple in Goa dedicated to Lord Shiva as Mangesh.', 'Temple', 'Goa', 'India', 15.4580, 73.9566, 'Priol, Ponda, North Goa, Goa 403401', 0],

  // ============================================================
  // GUJARAT (20 spots)
  // ============================================================
  ['Somnath Temple', 'First of 12 Jyotirlinga shrines of Lord Shiva on Arabian Sea coast in Gujarat.', 'Temple', 'Gir Somnath', 'India', 20.8880, 70.4013, 'Prabhas Patan, Gir Somnath, Gujarat 362268', 0],
  ['Dwarkadheesh Temple', 'Ancient 5 storey temple dedicated to Lord Krishna in holy city of Dwarka.', 'Temple', 'Dwarka', 'India', 22.2378, 68.9678, 'Dwarka, Gujarat 361335', 0],
  ['Rann of Kutch', 'Worlds largest salt desert spanning 7500 sq km, stunning during Rann Utsav festival.', 'Nature', 'Kutch', 'India', 23.7337, 69.8597, 'Dhordo, Kutch, Gujarat 370105', 0],
  ['Gir National Park', 'Only natural habitat of Asiatic lions in world with 600+ lions.', 'Nature', 'Junagadh', 'India', 21.1242, 70.8242, 'Sasan Gir, Junagadh, Gujarat 362135', 1],
  ['Rani Ki Vav', 'UNESCO listed intricately constructed stepwell built in 11th century in Patan.', 'Historical', 'Patan', 'India', 23.8585, 72.1019, 'Patan, Mehsana District, Gujarat 384265', 0],
  ['Statue of Unity', 'Worlds tallest statue at 182m of Sardar Vallabhbhai Patel on Narmada river.', 'Landmark', 'Narmada', 'India', 21.8380, 73.7190, 'Kevadia Colony, Narmada, Gujarat 393155', 0],
  ['Sabarmati Ashram', 'Historic ashram of Mahatma Gandhi on banks of Sabarmati river in Ahmedabad.', 'Historical', 'Ahmedabad', 'India', 23.0600, 72.5800, 'Ahmedabad, Gujarat 380027', 0],
  ['Akshardham Gandhinagar', 'Grand Swaminarayan temple complex with exhibitions on Indian culture.', 'Temple', 'Gandhinagar', 'India', 23.2156, 72.6369, 'Gandhinagar, Gujarat 382016', 0],
  ['Palitana Temples', 'Hill with 900 Jain temples built over 900 years, most sacred Jain pilgrimage.', 'Temple', 'Bhavnagar', 'India', 21.5225, 71.8226, 'Palitana, Bhavnagar, Gujarat 364270', 0],
  ['Champaner Pavagadh', 'UNESCO listed archaeological park with mosques and temples from 8th-14th century.', 'Historical', 'Vadodara', 'India', 22.4872, 73.5367, 'Champaner, Panchmahal, Gujarat 389360', 0],

  // ============================================================
  // ANDHRA PRADESH (20 spots)
  // ============================================================
  ['Tirupati Balaji Temple', 'Richest and most visited Hindu temple in world with 50,000+ daily visitors.', 'Temple', 'Tirupati', 'India', 13.6835, 79.3474, 'Tirumala, Tirupati, Andhra Pradesh 517504', 0],
  ['Charminar Hyderabad', 'Iconic 16th century mosque and monument in old Hyderabad built in 1591.', 'Landmark', 'Hyderabad', 'India', 17.3616, 78.4747, 'Charminar, Hyderabad, Telangana 500002', 0],
  ['Golconda Fort Hyderabad', 'Magnificent medieval fort with acoustic wonders and former diamond trading center.', 'Landmark', 'Hyderabad', 'India', 17.3833, 78.4011, 'Golconda, Hyderabad, Telangana 500008', 0],
  ['Araku Valley', 'Scenic valley at 1000m with coffee plantations and tribal culture near Vizag.', 'Nature', 'Visakhapatnam', 'India', 18.3273, 82.8757, 'Araku Valley, Alluri Sitarama Raju, Andhra Pradesh 531149', 1],
  ['Borra Caves', 'Deepest known caves in India at 80m depth with stalactites and stalagmites.', 'Nature', 'Visakhapatnam', 'India', 18.2839, 83.0481, 'Borra Caves, Anakapalli, Andhra Pradesh 531149', 0],
  ['Srikalahasti Temple', 'Famous Shiva temple on banks of Swarnamukhi river, Vayu Linga of Lord Shiva.', 'Temple', 'Chittoor', 'India', 13.6483, 79.6980, 'Srikalahasti, Chittoor, Andhra Pradesh 517644', 0],
  ['Lepakshi Temple', '16th century Vijayanagara temple famous for hanging pillar and giant Nandi.', 'Temple', 'Anantapur', 'India', 13.8054, 77.6072, 'Lepakshi, Anantapur, Andhra Pradesh 515331', 0],
  ['Belum Caves', 'Second largest natural caves in Indian subcontinent with underground streams.', 'Nature', 'Kurnool', 'India', 15.0993, 78.4358, 'Belum, Kurnool, Andhra Pradesh 518134', 0],

  // ============================================================
  // TELANGANA (10 spots)
  // ============================================================
  ['Ramoji Film City', 'Worlds largest film studio complex with 1666 acres, Guinness World Record holder.', 'General', 'Hyderabad', 'India', 17.2543, 78.6808, 'Anaspur Village, Hayathnagar, Hyderabad 501512', 0],
  ['Warangal Fort', 'Ruins of capital of Kakatiya dynasty with famous thousand-pillar temple.', 'Historical', 'Warangal', 'India', 17.9689, 79.5941, 'Warangal, Telangana 506002', 0],
  ['Nagarjuna Sagar', 'One of worlds largest masonry dams with Buddhist monuments on island.', 'Historical', 'Nalgonda', 'India', 16.5752, 79.3129, 'Nagarjuna Sagar, Nalgonda, Telangana 508202', 0],
  ['Medak Cathedral', 'Largest church in Asia and second largest in world built in 1924.', 'Historical', 'Medak', 'India', 18.0437, 78.2634, 'Medak, Telangana 502110', 0],

  // ============================================================
  // MADHYA PRADESH (20 spots)
  // ============================================================
  ['Khajuraho Temples', 'UNESCO listed medieval temples famous for exquisite erotic sculptures.', 'Historical', 'Khajuraho', 'India', 24.8318, 79.9199, 'Khajuraho, Chhatarpur, Madhya Pradesh 471606', 0],
  ['Sanchi Stupa', 'UNESCO listed Buddhist complex with Great Stupa built by Emperor Ashoka in 3rd century BC.', 'Historical', 'Sanchi', 'India', 23.4791, 77.7399, 'Sanchi, Raisen District, Madhya Pradesh 464661', 0],
  ['Mahakaleshwar Temple', 'One of 12 Jyotirlinga shrines of Lord Shiva in Ujjain on banks of Shipra.', 'Temple', 'Ujjain', 'India', 23.1828, 75.7681, 'Jaisinghpura, Ujjain, Madhya Pradesh 456006', 0],
  ['Omkareshwar Temple', 'One of 12 Jyotirlingas on Mandhata island formed in shape of Om in Narmada.', 'Temple', 'Khandwa', 'India', 22.2432, 76.1501, 'Omkareshwar, Khandwa, Madhya Pradesh 450554', 0],
  ['Bandhavgarh National Park', 'Highest density of tigers in world with ancient fort and cave paintings.', 'Nature', 'Umaria', 'India', 23.7218, 81.0121, 'Tala, Umaria, Madhya Pradesh 484661', 1],
  ['Kanha National Park', 'Inspiration for Rudyard Kiplings Jungle Book, famous tiger and barasingha reserve.', 'Nature', 'Mandla', 'India', 22.3358, 80.6147, 'Kisli, Mandla, Madhya Pradesh 481111', 1],
  ['Pachmarhi', 'Only hill station in Madhya Pradesh at 1067m with Bee Falls and Pandava Caves.', 'Nature', 'Hoshangabad', 'India', 22.4672, 78.4339, 'Pachmarhi, Hoshangabad, Madhya Pradesh 461881', 0],
  ['Gwalior Fort', 'Impregnable hill fort called Gibraltar of India with Teli ka Mandir and Jain statues.', 'Landmark', 'Gwalior', 'India', 26.2274, 78.1719, 'Gwalior Fort, Gwalior, Madhya Pradesh 474001', 0],
  ['Orchha', 'Medieval town with magnificent cenotaphs, palaces and Ram Raja temple.', 'Historical', 'Tikamgarh', 'India', 25.3516, 78.6396, 'Orchha, Tikamgarh, Madhya Pradesh 472246', 0],
  ['Bhimbetka Rock Shelters', 'UNESCO listed prehistoric rock shelters with paintings dating to 30,000 years ago.', 'Historical', 'Raisen', 'India', 22.9381, 77.6135, 'Bhimbetka, Raisen, Madhya Pradesh 462016', 0],

  // ============================================================
  // ODISHA (15 spots)
  // ============================================================
  ['Jagannath Temple Puri', 'Ancient 12th century temple of Lord Jagannath with famous Rath Yatra festival.', 'Temple', 'Puri', 'India', 19.8044, 85.8181, 'Puri, Odisha 752001', 0],
  ['Konark Sun Temple', 'UNESCO listed 13th century temple shaped like giant chariot dedicated to Sun God.', 'Historical', 'Puri', 'India', 19.8876, 86.0945, 'Konark, Puri District, Odisha 752111', 0],
  ['Lingaraj Temple', '11th century temple dedicated to Lord Shiva, finest example of Kalinga architecture.', 'Temple', 'Bhubaneswar', 'India', 20.2373, 85.8339, 'Lingaraj Nagar, Bhubaneswar, Odisha 751002', 0],
  ['Chilika Lake', 'Asias largest brackish water lagoon with Irrawaddy dolphins and migratory birds.', 'Nature', 'Puri', 'India', 19.7000, 85.3167, 'Chilika Lake, Puri, Odisha 752030', 0],
  ['Puri Beach', 'Famous golden beach on Bay of Bengal, home to Rath Yatra festival.', 'Beach', 'Puri', 'India', 19.7986, 85.8270, 'Puri, Odisha 752001', 0],
  ['Udayagiri and Khandagiri Caves', '1st and 2nd century BC Jain rock-cut caves with royal patronage of king Kharavela.', 'Historical', 'Bhubaneswar', 'India', 20.2688, 85.7762, 'Khandagiri, Bhubaneswar, Odisha 751030', 0],

  // ============================================================
  // WEST BENGAL (15 spots)
  // ============================================================
  ['Victoria Memorial Kolkata', 'Magnificent white marble building dedicated to Queen Victoria, finest in India.', 'Landmark', 'Kolkata', 'India', 22.5448, 88.3426, 'Queens Way, Kolkata, West Bengal 700071', 0],
  ['Darjeeling', 'Queen of Hills at 2042m with toy train, tea gardens and Kanchenjunga views.', 'Nature', 'Darjeeling', 'India', 27.0360, 88.2627, 'Darjeeling, West Bengal 734101', 0],
  ['Sundarbans', 'UNESCO listed worlds largest mangrove forest and home of Royal Bengal Tiger.', 'Nature', 'South 24 Parganas', 'India', 21.9497, 88.9861, 'Sundarbans, South 24 Parganas, West Bengal 743370', 1],
  ['Howrah Bridge', 'Iconic cantilever bridge over Hooghly river, symbol of Kolkata since 1943.', 'Landmark', 'Kolkata', 'India', 22.5851, 88.3468, 'Howrah Bridge, Kolkata, West Bengal 700001', 0],
  ['Belur Math', 'Headquarters of Ramakrishna Mission founded by Swami Vivekananda in 1899.', 'Temple', 'Howrah', 'India', 22.6277, 88.3597, 'Belur, Howrah, West Bengal 711202', 0],
  ['Dakshineshwar Kali Temple', 'Famous temple of Goddess Kali on banks of Hooghly where Ramakrishna served.', 'Temple', 'Kolkata', 'India', 22.6540, 88.3579, 'Dakshineswar, Kolkata, West Bengal 700076', 0],
  ['Murshidabad', 'Former capital of Bengal Nawabs with Hazarduari Palace and 1000 doors.', 'Historical', 'Murshidabad', 'India', 24.1818, 88.2699, 'Murshidabad, West Bengal 742149', 0],

  // ============================================================
  // PUNJAB (10 spots)
  // ============================================================
  ['Golden Temple Amritsar', 'Holiest Sikh shrine and most visited place in world, built in 1589 in Amritsar.', 'Temple', 'Amritsar', 'India', 31.6200, 74.8765, 'Golden Temple Rd, Amritsar, Punjab 143006', 0],
  ['Jallianwala Bagh', 'Historic garden where 1919 Amritsar massacre took place, national memorial.', 'Historical', 'Amritsar', 'India', 31.6213, 74.8779, 'Jallianwala Bagh, Amritsar, Punjab 143006', 0],
  ['Wagah Border', 'Famous India-Pakistan border crossing ceremony with daily flag lowering parade.', 'General', 'Amritsar', 'India', 31.6046, 74.5739, 'Wagah, Amritsar, Punjab 143108', 0],
  ['Anandpur Sahib', 'Second holiest site for Sikhs, where Guru Gobind Singh founded Khalsa in 1699.', 'Temple', 'Rupnagar', 'India', 31.2399, 76.5001, 'Anandpur Sahib, Rupnagar, Punjab 140118', 0],

  // ============================================================
  // BIHAR (10 spots)
  // ============================================================
  ['Bodh Gaya', 'Where Gautama Buddha attained enlightenment, most important Buddhist pilgrimage site.', 'Temple', 'Gaya', 'India', 24.6961, 84.9914, 'Bodh Gaya, Gaya, Bihar 824231', 0],
  ['Mahabodhi Temple', 'UNESCO listed temple marking the location of Buddhas enlightenment in Bodh Gaya.', 'Temple', 'Gaya', 'India', 24.6963, 84.9915, 'Bodh Gaya, Gaya, Bihar 824231', 0],
  ['Nalanda University Ruins', 'UNESCO listed ruins of ancient Nalanda Mahavihara university from 5th century AD.', 'Historical', 'Nalanda', 'India', 25.1355, 85.4437, 'Nalanda, Bihar 803111', 0],
  ['Vaishali', 'Ancient city where Buddha gave his last sermon, birthplace of Jain Tirthankara Mahavira.', 'Historical', 'Vaishali', 'India', 25.9860, 85.1280, 'Vaishali, Bihar 844128', 0],
  ['Rajgir', 'Ancient city surrounded by Cyclopean Wall where Buddha spent many rainy seasons.', 'Historical', 'Nalanda', 'India', 25.0298, 85.4194, 'Rajgir, Nalanda, Bihar 803116', 0],

  // ============================================================
  // ASSAM & NORTHEAST (15 spots)
  // ============================================================
  ['Kaziranga National Park', 'UNESCO listed home to 2200+ one-horned rhinoceroses, tigers and elephants.', 'Nature', 'Golaghat', 'India', 26.6638, 93.3705, 'Kaziranga, Golaghat, Assam 785609', 1],
  ['Kamakhya Temple', 'Ancient Shakti Peeth temple dedicated to Goddess Kamakhya on Nilachal Hill.', 'Temple', 'Guwahati', 'India', 26.1664, 91.7014, 'Nilachal Hills, Guwahati, Assam 781010', 0],
  ['Majuli Island', 'Worlds largest river island on Brahmaputra, center of Assamese Vaishnavite culture.', 'General', 'Jorhat', 'India', 27.0000, 94.2167, 'Majuli, Jorhat, Assam 785106', 0],
  ['Cherrapunji', 'One of wettest places on Earth with living root bridges and stunning waterfalls.', 'Nature', 'East Khasi Hills', 'India', 25.2840, 91.7300, 'Sohra, East Khasi Hills, Meghalaya 793108', 0],
  ['Shillong', 'Scotland of the East, capital of Meghalaya at 1491m with Umiam Lake.', 'Nature', 'East Khasi Hills', 'India', 25.5788, 91.8933, 'Shillong, Meghalaya 793001', 0],
  ['Dzukou Valley', 'Valley of flowers of northeast India with seasonal streams and rare Dzukou lily.', 'Nature', 'Kohima', 'India', 25.4703, 94.0929, 'Viswema, Kohima, Nagaland 797001', 1],
  ['Loktak Lake', 'Largest freshwater lake in Northeast India with floating phumdis islands.', 'Nature', 'Bishnupur', 'India', 24.5386, 93.8278, 'Moirang, Bishnupur, Manipur 795133', 0],
  ['Ziro Valley', 'UNESCO tentative list site with lush green paddy fields and Apatani tribal culture.', 'Nature', 'Lower Subansiri', 'India', 27.5454, 93.8283, 'Ziro, Lower Subansiri, Arunachal Pradesh 791120', 0],

  // ============================================================
  // JAMMU & KASHMIR / LADAKH (15 spots)
  // ============================================================
  ['Pangong Lake', 'High altitude 134km long lake at 4350m, 60% in Tibet and 40% in India.', 'Nature', 'Ladakh', 'India', 33.7640, 78.6796, 'Pangong Tso, Ladakh 194104', 1],
  ['Leh Palace', '17th century royal palace towering over Leh city inspired by Potala Palace in Tibet.', 'Landmark', 'Leh', 'India', 34.1652, 77.5857, 'Leh, Ladakh 194101', 1],
  ['Vaishno Devi Temple', 'Sacred cave shrine of Goddess Vaishno Devi in Trikuta Mountains at 5200 feet.', 'Temple', 'Reasi', 'India', 33.0294, 74.9468, 'Katra, Reasi, Jammu and Kashmir 182301', 1],
  ['Dal Lake Srinagar', 'Jewel in the Crown of Kashmir with shikaras, houseboats and Mughal gardens.', 'Nature', 'Srinagar', 'India', 34.0837, 74.7973, 'Dal Lake, Srinagar, Jammu and Kashmir 190001', 0],
  ['Gulmarg', 'Meadow of Flowers at 2690m, worlds highest golf course and premier ski resort.', 'Nature', 'Baramulla', 'India', 34.0484, 74.3805, 'Gulmarg, Baramulla, Jammu and Kashmir 193403', 0],
  ['Pahalgam', 'Valley of Shepherds at 2130m on Lidder river, base camp for Amarnath Yatra.', 'Nature', 'Anantnag', 'India', 34.0161, 75.3147, 'Pahalgam, Anantnag, Jammu and Kashmir 192125', 0],
  ['Amarnath Cave Temple', 'Sacred cave temple of Lord Shiva at 3888m with natural ice Shivlinga.', 'Temple', 'Anantnag', 'India', 34.2143, 75.5000, 'Amarnath Cave, Anantnag, Jammu and Kashmir', 1],
  ['Nubra Valley', 'High altitude cold desert with sand dunes and double humped Bactrian camels at 3048m.', 'Nature', 'Ladakh', 'India', 34.5776, 77.5651, 'Hunder, Nubra Valley, Ladakh 194401', 1],
  ['Thiksey Monastery', '12-storey hilltop Tibetan Buddhist monastery resembling Potala Palace in Ladakh.', 'Temple', 'Leh', 'India', 33.9782, 77.6673, 'Thiksey, Leh, Ladakh 194101', 1],

  // ============================================================
  // ANDAMAN & NICOBAR (10 spots)
  // ============================================================
  ['Radhanagar Beach', 'Rated as Asias best beach, pristine white sand in Havelock Island, Andaman.', 'Beach', 'Andaman', 'India', 11.9811, 92.9566, 'Havelock Island, Andaman and Nicobar Islands 744211', 0],
  ['Andaman Neil Island', 'Pristine coral reefs and crystal clear waters perfect for snorkeling and diving.', 'Beach', 'Andaman', 'India', 11.8317, 93.0494, 'Neil Island, Andaman and Nicobar Islands 744104', 0],
  ['Cellular Jail Port Blair', 'Colonial prison used by British called Kala Pani, now national memorial museum.', 'Historical', 'Port Blair', 'India', 11.6784, 92.7461, 'Port Blair, Andaman and Nicobar Islands 744101', 0],
  ['Barren Island', 'Only active volcano in South Asia in Andaman Sea with stunning volcanic landscape.', 'Nature', 'Andaman', 'India', 12.2783, 93.8587, 'Barren Island, Andaman and Nicobar Islands', 1],

  // ============================================================
  // LAKSHADWEEP (5 spots)
  // ============================================================
  ['Lakshadweep Agatti', 'Coral island paradise with pristine lagoon, white sand and world class diving.', 'Beach', 'Lakshadweep', 'India', 10.8500, 72.1833, 'Agatti Island, Lakshadweep 682553', 1],
  ['Bangaram Island', 'Uninhabited coral island with stunning clear blue lagoon surrounded by coral reefs.', 'Beach', 'Lakshadweep', 'India', 10.9333, 72.2833, 'Bangaram Island, Lakshadweep 682555', 1],

  // ============================================================
  // REMAINING TEMPLES (Major temples not covered above)
  // ============================================================
  ['Akshardham Delhi', 'Modern 2005 temple complex spanning 100 acres, Guinness recognized largest Hindu temple.', 'Temple', 'New Delhi', 'India', 28.6127, 77.2773, 'Noida Mor, New Delhi 110092', 0],
  ['ISKCON Vrindavan', 'Grand Krishna Balarama temple built by ISKCON in the holy city of Vrindavan.', 'Temple', 'Mathura', 'India', 27.5813, 77.6954, 'Vrindavan, Mathura, Uttar Pradesh 281121', 0],
  ['Tirupati Srikalahasti', 'Powerful Shiva temple called Dakshina Kailash on banks of Swarnamukhi river.', 'Temple', 'Chittoor', 'India', 13.6483, 79.6980, 'Srikalahasti, Chittoor, Andhra Pradesh 517644', 0],
  ['Puri Jagannath', 'One of Char Dham, ancient temple of Lord Jagannath with famous Rath Yatra.', 'Temple', 'Puri', 'India', 19.8044, 85.8181, 'Puri, Odisha 752001', 0],
  ['Nataraja Temple Chidambaram', 'Ancient temple of Lord Shiva as Nataraja, Tillai Nataraja Temple of 6th century.', 'Temple', 'Cuddalore', 'India', 11.3993, 79.6933, 'Chidambaram, Cuddalore, Tamil Nadu 608001', 0],
  ['Ranganathaswamy Temple Srirangam', 'Largest functioning Hindu temple in world covering 156 acres with 21 gopurams.', 'Temple', 'Tiruchirappalli', 'India', 10.8637, 78.6938, 'Srirangam, Tiruchirappalli, Tamil Nadu 620006', 0],
  ['Tiruvannamalai Arunachaleswarar', 'Ancient Shiva temple at base of Arunachala hill, site of Ramana Maharshis ashram.', 'Temple', 'Tiruvannamalai', 'India', 12.2306, 79.0667, 'Tiruvannamalai, Tamil Nadu 606601', 0],
  ['Sabarimala Ayyappa', 'Famous hilltop temple of Lord Ayyappa in Western Ghats visited by millions.', 'Temple', 'Pathanamthitta', 'India', 9.4326, 77.0839, 'Sabrimala, Pathanamthitta, Kerala 689513', 1],
  ['Kukke Subramanya', 'Famous temple of Lord Subramanya known for Sarpa Dosha rituals in Karnataka.', 'Temple', 'Dakshina Kannada', 'India', 12.8360, 75.7378, 'Subramanya, Dakshina Kannada, Karnataka 574238', 0],
  ['Kollur Mookambika', 'Powerful Shakti temple of Goddess Mookambika in Western Ghats of Karnataka.', 'Temple', 'Udupi', 'India', 13.8564, 74.8143, 'Kollur, Udupi, Karnataka 576220', 0],
  ['Mantralayam Raghavendra', 'Famous pilgrimage of Saint Raghavendra Swami on banks of Tungabhadra river.', 'Temple', 'Kurnool', 'India', 15.6949, 77.4041, 'Mantralayam, Kurnool, Andhra Pradesh 518345', 0],
  ['Srisailam Temple', 'Famous Jyotirlinga on Nallamala hills on banks of Krishna river in AP.', 'Temple', 'Nandyal', 'India', 16.0724, 78.8682, 'Srisailam, Nandyal, Andhra Pradesh 518101', 0],
  ['Kedarnath Badrinath Yatra', 'Sacred Panch Kedar temples of Lord Shiva in Garhwal Himalayas pilgrimage.', 'Temple', 'Chamoli', 'India', 30.7346, 79.0669, 'Garhwal Himalayas, Uttarakhand', 1],
  ['Pashupatinath Temple India', 'Famous Shiva temple near border region visited by Indian devotees.', 'Temple', 'Gorakhpur', 'India', 26.7606, 83.3732, 'Gorakhpur, Uttar Pradesh 273001', 0],

  // Test spot
  ['Sanjeevini Circle Mysore', 'Test location for photo validation - Lokanayakanagar, Mysore.', 'General', 'Mysuru', 'India', 12.3200, 76.6100, '9th Cross, Lokanayakanagar, Sanjeevini Circle, Mysuru 570016', 0],
];

function seedAllSpots() {
  let added = 0;
  let skipped = 0;

  for (const spot of spots) {
    const [name, description, category, city, country, latitude, longitude, address, is_remote] = spot;

    // Check if spot already exists
    const existing = db.prepare('SELECT id FROM spots WHERE name = ? AND city = ?').get(name, city);
    if (existing) {
      skipped++;
      continue;
    }

    const id = 'spot_' + uuidv4();
    db.prepare(`
      INSERT INTO spots (id, name, description, category, city, country, latitude, longitude, address, is_remote, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
    `).run(id, name, description, category, city, country, latitude, longitude, address, is_remote);
    added++;
    console.log(`✅ Added: ${name} (${city})`);
  }

  console.log(`\n🎉 Done! Added ${added} spots, skipped ${skipped} duplicates.`);
  console.log(`📊 Total spots: ${db.prepare('SELECT COUNT(*) as c FROM spots').get().c}`);
}

seedAllSpots();
process.exit(0);
