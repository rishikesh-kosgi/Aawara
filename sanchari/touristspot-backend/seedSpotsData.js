function spot(name, description, category, city, country, latitude, longitude, address, isRemote = 0) {
  return { name, description, category, city, country, latitude, longitude, address, isRemote };
}

const rawSeedSpots = [
  // India: Landmarks / Historical
  spot('Taj Mahal', 'Iconic marble mausoleum and UNESCO World Heritage site.', 'Landmark', 'Agra', 'India', 27.1751, 78.0421, 'Dharmapuri, Agra, Uttar Pradesh', 0),
  spot('Agra Fort', 'Massive Mughal fort of red sandstone on the Yamuna river.', 'Historical', 'Agra', 'India', 27.1795, 78.0211, 'Rakabganj, Agra, Uttar Pradesh', 0),
  spot('India Gate', 'National war memorial arch in central Delhi.', 'Landmark', 'New Delhi', 'India', 28.6129, 77.2295, 'Kartavya Path, New Delhi', 0),
  spot('Qutub Minar', 'UNESCO-listed medieval minaret in Delhi.', 'Historical', 'New Delhi', 'India', 28.5244, 77.1855, 'Mehrauli, New Delhi', 0),
  spot('Red Fort', 'Historic Mughal fort complex in Old Delhi.', 'Historical', 'Delhi', 'India', 28.6562, 77.241, 'Netaji Subhash Marg, Delhi', 0),
  spot('Gateway of India', 'Historic seafront arch overlooking Mumbai harbour.', 'Landmark', 'Mumbai', 'India', 18.922, 72.8347, 'Apollo Bandar, Mumbai, Maharashtra', 0),
  spot('Marine Drive', 'Iconic art deco boulevard and bayfront promenade.', 'Landmark', 'Mumbai', 'India', 18.943, 72.8238, 'Marine Drive, Mumbai, Maharashtra', 0),
  spot('Chhatrapati Shivaji Maharaj Terminus', 'UNESCO-listed Victorian Gothic railway station.', 'Historical', 'Mumbai', 'India', 18.94, 72.8355, 'CST Area, Mumbai, Maharashtra', 0),
  spot('Hawa Mahal', 'The Palace of Winds and one of Jaipur’s best-known facades.', 'Landmark', 'Jaipur', 'India', 26.9239, 75.8267, 'Hawa Mahal Road, Jaipur, Rajasthan', 0),
  spot('Amer Fort', 'Hilltop Rajput fort overlooking Maota Lake.', 'Historical', 'Jaipur', 'India', 26.9855, 75.8513, 'Amer, Jaipur, Rajasthan', 0),
  spot('City Palace Udaipur', 'Lake-facing palace complex in Udaipur.', 'Landmark', 'Udaipur', 'India', 24.5767, 73.6835, 'Old City, Udaipur, Rajasthan', 0),
  spot('Mehrangarh Fort', 'One of India’s grandest hill forts towering above Jodhpur.', 'Historical', 'Jodhpur', 'India', 26.2978, 73.0181, 'Fort Road, Jodhpur, Rajasthan', 0),
  spot('Jaisalmer Fort', 'Living desert fort of golden sandstone.', 'Historical', 'Jaisalmer', 'India', 26.9157, 70.9083, 'Fort Road, Jaisalmer, Rajasthan', 0),
  spot('Hampi', 'Vijayanagara-era ruins spread across a surreal boulder landscape.', 'Historical', 'Hampi', 'India', 15.335, 76.46, 'Hampi, Karnataka', 0),
  spot('Mysore Palace', 'Illuminated royal palace and major heritage landmark.', 'Landmark', 'Mysuru', 'India', 12.3052, 76.6552, 'Mysuru, Karnataka', 0),
  spot('Badami Caves', 'Ancient rock-cut cave temples in sandstone cliffs.', 'Historical', 'Badami', 'India', 15.9149, 75.676, 'Badami, Karnataka', 0),
  spot('Charminar', '16th-century monument and symbol of Hyderabad.', 'Historical', 'Hyderabad', 'India', 17.3616, 78.4747, 'Charminar, Hyderabad, Telangana', 0),
  spot('Golconda Fort', 'Medieval hill fort known for acoustics and history.', 'Historical', 'Hyderabad', 'India', 17.3833, 78.4011, 'Golconda, Hyderabad, Telangana', 0),
  spot('Victoria Memorial', 'Grand marble memorial and museum in Kolkata.', 'Landmark', 'Kolkata', 'India', 22.5448, 88.3426, 'Queens Way, Kolkata, West Bengal', 0),
  spot('Howrah Bridge', 'Cantilever bridge and enduring symbol of Kolkata.', 'Landmark', 'Kolkata', 'India', 22.585, 88.3468, 'Howrah, West Bengal', 0),
  spot('Ajanta Caves', 'Ancient Buddhist cave complex with celebrated murals.', 'Historical', 'Aurangabad', 'India', 20.5519, 75.7033, 'Ajanta, Maharashtra', 0),
  spot('Ellora Caves', 'Rock-cut cave complex spanning Buddhist, Jain and Hindu monuments.', 'Historical', 'Aurangabad', 'India', 20.0258, 75.179, 'Ellora, Maharashtra', 0),
  spot('Khajuraho Temples', 'UNESCO temple group famed for intricate carvings.', 'Historical', 'Khajuraho', 'India', 24.8518, 79.9199, 'Khajuraho, Madhya Pradesh', 0),
  spot('Sanchi Stupa', 'Ancient Buddhist stupa complex from the Mauryan era.', 'Historical', 'Sanchi', 'India', 23.4794, 77.7397, 'Sanchi, Madhya Pradesh', 0),
  spot('Konark Sun Temple', '13th-century chariot-shaped temple monument.', 'Historical', 'Konark', 'India', 19.8876, 86.0945, 'Konark, Odisha', 0),
  spot('Cellular Jail', 'Historic colonial prison and national memorial.', 'Historical', 'Port Blair', 'India', 11.6738, 92.7626, 'Port Blair, Andaman and Nicobar Islands', 0),
  spot('Leh Palace', 'Historic palace overlooking Leh town and valley.', 'Historical', 'Leh', 'India', 34.1673, 77.5848, 'Leh, Ladakh', 0),

  // India: Temples
  spot('Golden Temple', 'Most revered Sikh gurdwara set around a sacred pool.', 'Temple', 'Amritsar', 'India', 31.62, 74.8765, 'Golden Temple Road, Amritsar, Punjab', 0),
  spot('Kedarnath Temple', 'Ancient Himalayan shrine dedicated to Shiva.', 'Temple', 'Rudraprayag', 'India', 30.7346, 79.0669, 'Kedarnath, Uttarakhand', 1),
  spot('Badrinath Temple', 'Major Char Dham temple high in the Himalayas.', 'Temple', 'Chamoli', 'India', 30.7433, 79.4938, 'Badrinath, Uttarakhand', 1),
  spot('Meenakshi Amman Temple', 'Grand Dravidian temple complex with colorful towers.', 'Temple', 'Madurai', 'India', 9.9195, 78.1193, 'Madurai, Tamil Nadu', 0),
  spot('Brihadeeswara Temple', 'UNESCO-listed Chola temple in Thanjavur.', 'Temple', 'Thanjavur', 'India', 10.7828, 79.1318, 'Thanjavur, Tamil Nadu', 0),
  spot('Ramanathaswamy Temple', 'Rameswaram temple known for its long pillared corridors.', 'Temple', 'Rameswaram', 'India', 9.2881, 79.3174, 'Rameswaram, Tamil Nadu', 0),
  spot('Jagannath Temple', 'One of India’s most important pilgrimage temples.', 'Temple', 'Puri', 'India', 19.8049, 85.8186, 'Puri, Odisha', 0),
  spot('Mahabodhi Temple', 'Buddhist temple marking Buddha’s enlightenment site.', 'Temple', 'Bodh Gaya', 'India', 24.6959, 84.9911, 'Bodh Gaya, Bihar', 0),
  spot('Vaishno Devi', 'Major cave shrine in the Trikuta hills.', 'Temple', 'Katra', 'India', 33.0307, 74.9497, 'Katra, Jammu and Kashmir', 1),
  spot('Tawang Monastery', 'Largest monastery in India in the Arunachal Himalayas.', 'Temple', 'Tawang', 'India', 27.5865, 91.8594, 'Tawang, Arunachal Pradesh', 1),
  spot('Mahabalipuram Shore Temple', 'Seaside Pallava temple on the Bay of Bengal.', 'Temple', 'Mahabalipuram', 'India', 12.6166, 80.1999, 'Mahabalipuram, Tamil Nadu', 0),
  spot('Padmanabhaswamy Temple', 'Historic temple in Thiruvananthapuram famed for its treasure.', 'Temple', 'Thiruvananthapuram', 'India', 8.4833, 76.9462, 'East Fort, Thiruvananthapuram, Kerala', 0),

  // India: Nature / Beach / General
  spot('Athirappilly Falls', 'Largest waterfall in Kerala.', 'Nature', 'Thrissur', 'India', 10.2867, 76.5694, 'Athirappilly, Kerala', 0),
  spot('Dudhsagar Falls', 'Four-tiered waterfall on the Goa-Karnataka border.', 'Nature', 'Goa', 'India', 15.3147, 74.3144, 'Dudhsagar, Goa', 1),
  spot('Jog Falls', 'One of India’s tallest plunge waterfalls.', 'Nature', 'Shivamogga', 'India', 14.2269, 74.7921, 'Jog Falls, Karnataka', 0),
  spot('Coorg Coffee Estates', 'Lush plantation landscape in the Kodagu hills.', 'Nature', 'Coorg', 'India', 12.3375, 75.8069, 'Madikeri, Karnataka', 0),
  spot('Munnar Tea Gardens', 'Rolling tea estates and cool mountain views.', 'Nature', 'Munnar', 'India', 10.0889, 77.0595, 'Munnar, Kerala', 0),
  spot('Alleppey Backwaters', 'Famous backwater network navigated by houseboats.', 'Nature', 'Alappuzha', 'India', 9.4981, 76.3388, 'Alappuzha, Kerala', 0),
  spot('Wayanad Wildlife Sanctuary', 'Forest reserve with elephants, birds and trekking routes.', 'Nature', 'Wayanad', 'India', 11.6854, 76.132, 'Wayanad, Kerala', 1),
  spot('Valley of Flowers', 'Alpine valley with seasonal wildflowers and mountain scenery.', 'Nature', 'Chamoli', 'India', 30.7283, 79.605, 'Valley of Flowers, Uttarakhand', 1),
  spot('Nainital Lake', 'Lake ringed by hills and town promenades.', 'Nature', 'Nainital', 'India', 29.3919, 79.4542, 'Nainital, Uttarakhand', 0),
  spot('Pangong Lake', 'High-altitude lake stretching across Ladakh.', 'Nature', 'Ladakh', 'India', 33.764, 78.6796, 'Pangong Tso, Ladakh', 1),
  spot('Nubra Valley', 'High-altitude cold desert valley with dunes and monasteries.', 'Nature', 'Leh', 'India', 34.6257, 77.5515, 'Nubra Valley, Ladakh', 1),
  spot('Dal Lake', 'Houseboat-dotted lake in Srinagar.', 'Nature', 'Srinagar', 'India', 34.1204, 74.8474, 'Dal Lake, Srinagar, Jammu and Kashmir', 0),
  spot('Kaziranga National Park', 'Wildlife reserve famed for the one-horned rhinoceros.', 'Nature', 'Kaziranga', 'India', 26.5775, 93.1711, 'Kaziranga, Assam', 1),
  spot('Sundarbans National Park', 'Mangrove wilderness and tiger habitat.', 'Nature', 'Sundarbans', 'India', 21.9497, 88.8776, 'Sundarbans, West Bengal', 1),
  spot('Gir National Park', 'Only natural habitat of the Asiatic lion.', 'Nature', 'Junagadh', 'India', 21.124, 70.8247, 'Gir, Gujarat', 1),
  spot('Rann of Kutch', 'White salt desert with dramatic seasonal landscapes.', 'Nature', 'Kutch', 'India', 23.7337, 69.8597, 'Great Rann of Kutch, Gujarat', 1),
  spot('Loktak Lake', 'Freshwater lake known for floating phumdis.', 'Nature', 'Bishnupur', 'India', 24.4971, 93.7982, 'Loktak Lake, Manipur', 1),
  spot('Cherrapunji', 'Hill destination known for caves, rain and waterfalls.', 'Nature', 'Sohra', 'India', 25.2702, 91.7326, 'Sohra, Meghalaya', 1),
  spot('Araku Valley', 'Scenic valley with coffee plantations and tribal culture.', 'Nature', 'Visakhapatnam', 'India', 18.3273, 82.8757, 'Araku Valley, Andhra Pradesh', 1),
  spot('Rishikesh', 'Riverfront spiritual town and adventure base.', 'General', 'Rishikesh', 'India', 30.0869, 78.2676, 'Rishikesh, Uttarakhand', 0),
  spot('Statue of Unity', 'World’s tallest statue overlooking the Narmada.', 'Landmark', 'Kevadia', 'India', 21.838, 73.7191, 'Kevadia, Gujarat', 0),
  spot('Marina Beach', 'One of the world’s longest urban beaches.', 'Beach', 'Chennai', 'India', 13.0499, 80.2824, 'Marina Beach, Chennai, Tamil Nadu', 0),
  spot('Varkala Beach', 'Cliff-backed beach on Kerala’s coast.', 'Beach', 'Varkala', 'India', 8.7379, 76.7163, 'Varkala, Kerala', 0),
  spot('Kovalam Beach', 'Popular crescent beach near Thiruvananthapuram.', 'Beach', 'Kovalam', 'India', 8.4004, 76.9787, 'Kovalam, Kerala', 0),
  spot('Calangute Beach', 'One of Goa’s busiest and best-known beaches.', 'Beach', 'Goa', 'India', 15.544, 73.7528, 'Calangute, North Goa', 0),
  spot('Palolem Beach', 'Scenic crescent beach in South Goa.', 'Beach', 'Goa', 'India', 15.01, 74.0232, 'Palolem, South Goa', 0),
  spot('Baga Beach', 'Goa beach popular for nightlife and water sports.', 'Beach', 'Goa', 'India', 15.5569, 73.752, 'Baga, North Goa', 0),
  spot('Radhanagar Beach', 'White-sand beach in the Andaman Islands.', 'Beach', 'Swaraj Dweep', 'India', 11.9845, 92.9497, 'Swaraj Dweep, Andaman and Nicobar Islands', 1),
  spot('Kanyakumari Beach', 'Southern tip beach where three seas meet.', 'Beach', 'Kanyakumari', 'India', 8.078, 77.5411, 'Kanyakumari, Tamil Nadu', 0),

  // India: Trekking
  spot('Rohtang Pass', 'High mountain pass near Manali with alpine views.', 'Trekking', 'Manali', 'India', 32.3726, 77.2375, 'Rohtang Pass, Himachal Pradesh', 1),
  spot('Solang Valley', 'Adventure valley near Manali with mountain trails.', 'Trekking', 'Manali', 'India', 32.3195, 77.1518, 'Solang Valley, Himachal Pradesh', 1),
  spot('Spiti Valley', 'Remote cold desert ideal for road trips and high-altitude treks.', 'Trekking', 'Spiti', 'India', 32.2432, 78.0358, 'Spiti Valley, Himachal Pradesh', 1),
  spot('Triund', 'Classic ridge trek above McLeod Ganj with Dhauladhar views.', 'Trekking', 'Dharamshala', 'India', 32.2598, 76.3621, 'Triund, Himachal Pradesh', 1),
  spot('Hampta Pass', 'Popular crossover trek between lush Kullu and arid Lahaul.', 'Trekking', 'Manali', 'India', 32.3783, 77.3588, 'Hampta Pass, Himachal Pradesh', 1),
  spot('Bhrigu Lake', 'High-altitude grassland and alpine lake trek.', 'Trekking', 'Manali', 'India', 32.3162, 77.2109, 'Bhrigu Lake, Himachal Pradesh', 1),
  spot('Valley of Flowers Trek', 'Seasonal Himalayan trek through meadows of wildflowers.', 'Trekking', 'Chamoli', 'India', 30.7281, 79.6048, 'Valley of Flowers trail, Uttarakhand', 1),
  spot('Kedarkantha', 'Winter summit trek popular for snow and forest camps.', 'Trekking', 'Uttarkashi', 'India', 31.0216, 78.1238, 'Kedarkantha, Uttarakhand', 1),
  spot('Har Ki Dun', 'Ancient valley trek through villages and alpine meadows.', 'Trekking', 'Uttarkashi', 'India', 31.2066, 78.1805, 'Har Ki Dun, Uttarakhand', 1),
  spot('Chadar Trek', 'Frozen-river expedition across the Zanskar in winter.', 'Trekking', 'Leh', 'India', 33.4903, 76.9725, 'Zanskar Valley, Ladakh', 1),
  spot('Markha Valley', 'Multi-day Ladakh trail through monasteries and canyons.', 'Trekking', 'Leh', 'India', 33.8037, 77.7651, 'Markha Valley, Ladakh', 1),
  spot('Dzongri Trek', 'High-elevation Sikkim trek with Kanchenjunga panoramas.', 'Trekking', 'Yuksom', 'India', 27.3828, 88.2164, 'Dzongri, Sikkim', 1),
  spot('Goechala Trek', 'Premier Sikkim trek for sunrise views over Kanchenjunga.', 'Trekking', 'Yuksom', 'India', 27.3507, 88.1334, 'Goechala, Sikkim', 1),
  spot('Dzukou Valley', 'High-altitude valley on the Nagaland-Manipur border.', 'Trekking', 'Kohima', 'India', 25.5588, 94.091, 'Dzukou Valley', 1),
  spot('Netravati Peak', 'Western Ghats summit trek with rolling shola views.', 'Trekking', 'Chikkamagaluru', 'India', 12.9762, 75.3998, 'Netravati Peak, Karnataka', 1),
  spot('Kumara Parvatha', 'Strenuous but iconic Western Ghats ridge trek.', 'Trekking', 'Kodagu', 'India', 12.6628, 75.6712, 'Kumara Parvatha, Karnataka', 1),
  spot('Tadiandamol', 'Highest peak in Coorg with panoramic hill views.', 'Trekking', 'Coorg', 'India', 12.1934, 75.7264, 'Tadiandamol, Karnataka', 1),
  spot('Rajmachi Fort Trek', 'Popular Sahyadri trek linking twin hill forts.', 'Trekking', 'Lonavala', 'India', 18.8289, 73.4002, 'Rajmachi, Maharashtra', 1),
  spot('Harishchandragad', 'Sahyadri fort trek famous for Konkan Kada cliffs.', 'Trekking', 'Ahmednagar', 'India', 19.3931, 73.7762, 'Harishchandragad, Maharashtra', 1),
  spot('Sandakphu', 'Highest point in West Bengal with four 8000ers visible.', 'Trekking', 'Darjeeling', 'India', 27.1062, 88.0051, 'Sandakphu, West Bengal', 1),

  // United States: Landmarks / Historical
  spot('Statue of Liberty', 'Iconic neoclassical statue in New York Harbor.', 'Landmark', 'New York City', 'United States', 40.6892, -74.0445, 'Liberty Island, New York, NY', 0),
  spot('Times Square', 'Major commercial intersection and entertainment district.', 'Landmark', 'New York City', 'United States', 40.758, -73.9855, 'Times Square, New York, NY', 0),
  spot('Central Park', 'Vast urban park in the heart of Manhattan.', 'Nature', 'New York City', 'United States', 40.7829, -73.9654, 'Central Park, New York, NY', 0),
  spot('Brooklyn Bridge', 'Historic suspension bridge linking Manhattan and Brooklyn.', 'Landmark', 'New York City', 'United States', 40.7061, -73.9969, 'Brooklyn Bridge, New York, NY', 0),
  spot('Empire State Building', 'Art Deco skyscraper and observation deck.', 'Landmark', 'New York City', 'United States', 40.7484, -73.9857, '20 W 34th St, New York, NY', 0),
  spot('Golden Gate Bridge', 'World-famous orange suspension bridge.', 'Landmark', 'San Francisco', 'United States', 37.8199, -122.4783, 'Golden Gate Bridge, San Francisco, CA', 0),
  spot('Alcatraz Island', 'Historic island prison in San Francisco Bay.', 'Historical', 'San Francisco', 'United States', 37.8267, -122.423, 'Alcatraz Island, San Francisco, CA', 0),
  spot('Fisherman\'s Wharf', 'Popular waterfront district with piers and sea lions.', 'Landmark', 'San Francisco', 'United States', 37.808, -122.4177, 'Fisherman\'s Wharf, San Francisco, CA', 0),
  spot('Hollywood Sign', 'Iconic hillside landmark overlooking Los Angeles.', 'Landmark', 'Los Angeles', 'United States', 34.1341, -118.3215, 'Mount Lee, Los Angeles, CA', 1),
  spot('Griffith Observatory', 'Landmark observatory with sweeping city views.', 'Landmark', 'Los Angeles', 'United States', 34.1184, -118.3004, '2800 E Observatory Rd, Los Angeles, CA', 0),
  spot('Santa Monica Pier', 'Classic Pacific coast pier with rides and beach access.', 'Beach', 'Santa Monica', 'United States', 34.0094, -118.4973, '200 Santa Monica Pier, Santa Monica, CA', 0),
  spot('Walt Disney World', 'Major themed entertainment resort in Florida.', 'Landmark', 'Orlando', 'United States', 28.3852, -81.5639, 'Lake Buena Vista, Orlando, FL', 0),
  spot('French Quarter', 'Historic heart of New Orleans with Creole architecture.', 'Historical', 'New Orleans', 'United States', 29.9584, -90.0644, 'French Quarter, New Orleans, LA', 0),
  spot('National Mall', 'Monument-lined civic park in Washington, D.C.', 'Landmark', 'Washington', 'United States', 38.8896, -77.0091, 'National Mall, Washington, DC', 0),
  spot('Lincoln Memorial', 'Monument honoring Abraham Lincoln.', 'Historical', 'Washington', 'United States', 38.8893, -77.0502, 'Lincoln Memorial Circle NW, Washington, DC', 0),
  spot('White House', 'Official residence of the President of the United States.', 'Landmark', 'Washington', 'United States', 38.8977, -77.0365, '1600 Pennsylvania Ave NW, Washington, DC', 0),
  spot('Independence Hall', 'Birthplace of the Declaration of Independence.', 'Historical', 'Philadelphia', 'United States', 39.9489, -75.150, '520 Chestnut St, Philadelphia, PA', 0),
  spot('Space Needle', 'Seattle’s iconic observation tower.', 'Landmark', 'Seattle', 'United States', 47.6205, -122.3493, '400 Broad St, Seattle, WA', 0),
  spot('Millennium Park', 'Downtown Chicago park home to Cloud Gate.', 'Landmark', 'Chicago', 'United States', 41.8826, -87.6226, 'Millennium Park, Chicago, IL', 0),
  spot('Willis Tower Skydeck', 'Observation deck in one of Chicago’s tallest towers.', 'Landmark', 'Chicago', 'United States', 41.8789, -87.6359, '233 S Wacker Dr, Chicago, IL', 0),
  spot('The Alamo', 'Historic mission and battlefield in San Antonio.', 'Historical', 'San Antonio', 'United States', 29.4259, -98.4861, '300 Alamo Plaza, San Antonio, TX', 0),
  spot('Mount Rushmore', 'Granite monument of four U.S. presidents.', 'Landmark', 'Keystone', 'United States', 43.8791, -103.4591, '13000 SD-244, Keystone, SD', 0),

  // United States: Nature / Trekking / Beach
  spot('Grand Canyon South Rim', 'Immense canyon vistas and scenic overlooks.', 'Nature', 'Grand Canyon', 'United States', 36.0544, -112.1401, 'South Rim, Grand Canyon National Park, AZ', 0),
  spot('Yosemite Valley', 'Granite cliffs, waterfalls and giant sequoias.', 'Nature', 'Yosemite National Park', 'United States', 37.7456, -119.5936, 'Yosemite Valley, CA', 0),
  spot('Yellowstone National Park', 'Geothermal park with geysers and wildlife.', 'Nature', 'Yellowstone National Park', 'United States', 44.428, -110.5885, 'Yellowstone National Park, WY', 0),
  spot('Zion Canyon', 'Steep red cliffs and canyon scenery in Utah.', 'Nature', 'Springdale', 'United States', 37.2982, -113.0263, 'Zion National Park, UT', 0),
  spot('Bryce Canyon Amphitheater', 'Hoodoo-filled natural amphitheater in Utah.', 'Nature', 'Bryce', 'United States', 37.593, -112.1871, 'Bryce Canyon National Park, UT', 0),
  spot('Arches National Park', 'Desert park of natural stone arches.', 'Nature', 'Moab', 'United States', 38.7331, -109.5925, 'Arches National Park, UT', 0),
  spot('Antelope Canyon', 'Slot canyon known for sculpted sandstone and light beams.', 'Nature', 'Page', 'United States', 36.8619, -111.3743, 'Antelope Canyon, Page, AZ', 1),
  spot('Niagara Falls State Park', 'Powerful waterfalls on the U.S.-Canada border.', 'Nature', 'Niagara Falls', 'United States', 43.0828, -79.0742, 'Niagara Falls, NY', 0),
  spot('Great Smoky Mountains National Park', 'Biodiverse Appalachian park with scenic drives and hikes.', 'Nature', 'Gatlinburg', 'United States', 35.6118, -83.4895, 'Great Smoky Mountains National Park, TN', 0),
  spot('Rocky Mountain National Park', 'Alpine lakes, peaks and wildlife in Colorado.', 'Nature', 'Estes Park', 'United States', 40.3428, -105.6836, 'Rocky Mountain National Park, CO', 0),
  spot('Everglades National Park', 'Wetland wilderness of sawgrass marshes and mangroves.', 'Nature', 'Homestead', 'United States', 25.2866, -80.8987, 'Everglades National Park, FL', 0),
  spot('Acadia National Park', 'Coastal granite peaks and ocean scenery in Maine.', 'Nature', 'Bar Harbor', 'United States', 44.3386, -68.2733, 'Acadia National Park, ME', 0),
  spot('Death Valley National Park', 'Extreme desert landscapes and salt flats.', 'Nature', 'Death Valley', 'United States', 36.5323, -116.9325, 'Death Valley National Park, CA', 0),
  spot('Glacier National Park', 'Dramatic peaks, alpine lakes and classic road views.', 'Nature', 'West Glacier', 'United States', 48.7596, -113.787, 'Glacier National Park, MT', 0),
  spot('Lake Tahoe', 'Large alpine lake with beaches and mountain scenery.', 'Nature', 'South Lake Tahoe', 'United States', 38.9399, -119.9772, 'Lake Tahoe, CA/NV', 0),
  spot('Waikiki Beach', 'World-famous urban beach in Honolulu.', 'Beach', 'Honolulu', 'United States', 21.2767, -157.8275, 'Waikiki, Honolulu, HI', 0),
  spot('South Beach', 'Iconic Miami beach known for Art Deco surroundings.', 'Beach', 'Miami Beach', 'United States', 25.7826, -80.1341, 'South Beach, Miami Beach, FL', 0),
  spot('Cannon Beach', 'Pacific Northwest beach with Haystack Rock.', 'Beach', 'Cannon Beach', 'United States', 45.8918, -123.9615, 'Cannon Beach, OR', 0),
  spot('Na Pali Coast', 'Dramatic cliff-lined coastline on Kauai.', 'Beach', 'Hanalei', 'United States', 22.2022, -159.6211, 'Na Pali Coast, Kauai, HI', 1),
  spot('Monument Valley', 'Red sandstone buttes on the Arizona-Utah border.', 'Nature', 'Oljato-Monument Valley', 'United States', 36.998, -110.0982, 'Monument Valley, AZ/UT', 1),
  spot('The Wave', 'Iconic striped sandstone formation in the Coyote Buttes.', 'Trekking', 'Kanab', 'United States', 36.9956, -112.0068, 'Coyote Buttes North, AZ', 1),
  spot('Half Dome Trail', 'Signature Yosemite summit trek.', 'Trekking', 'Yosemite National Park', 'United States', 37.7459, -119.5332, 'Half Dome, Yosemite National Park, CA', 1),
  spot('Angels Landing', 'Steep ridge hike with panoramic Zion views.', 'Trekking', 'Springdale', 'United States', 37.2692, -112.9507, 'Angels Landing, Zion National Park, UT', 1),
  spot('Bright Angel Trail', 'Classic descent route into the Grand Canyon.', 'Trekking', 'Grand Canyon', 'United States', 36.0574, -112.1438, 'Bright Angel Trailhead, AZ', 1),
  spot('Delicate Arch Trail', 'Short but iconic hike to Arches’ most famous formation.', 'Trekking', 'Moab', 'United States', 38.7436, -109.4993, 'Delicate Arch Trail, UT', 1),
  spot('Hidden Lake Overlook', 'Popular Glacier National Park alpine viewpoint hike.', 'Trekking', 'West Glacier', 'United States', 48.6969, -113.7183, 'Logan Pass, Glacier National Park, MT', 1),
  spot('Old Rag Mountain', 'Rock scramble hike in Shenandoah National Park.', 'Trekking', 'Sperryville', 'United States', 38.5659, -78.3058, 'Old Rag Mountain, VA', 1),
];

function normalizePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSpotKey(spotItem) {
  return [
    normalizePart(spotItem.name),
    normalizePart(spotItem.city),
    normalizePart(spotItem.country),
  ].join('|');
}

function buildSeedSpots() {
  const seen = new Map();

  for (const item of rawSeedSpots) {
    const key = makeSpotKey(item);
    if (!seen.has(key)) {
      seen.set(key, item);
      continue;
    }

    const existing = seen.get(key);
    if ((item.description || '').length > (existing.description || '').length) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values()).map((item, index) => [
    `spot_seed_${index + 1}`,
    item.name,
    item.description,
    item.category,
    item.city,
    item.country,
    item.latitude,
    item.longitude,
    item.address,
    item.isRemote,
  ]);
}

const seedSpots = buildSeedSpots();

module.exports = { seedSpots, makeSpotKey };
