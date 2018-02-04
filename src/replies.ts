export function goodFish() {
    return `Congrats! You got $fishName in $locationName .  
    On average they grow to $fishLength meters long and weight $fishWeight kg.
    Yum! This fish is recommended for health for the following reasons: 1, 3, 5 
     
    :: I wanna upload another pic of fish!
    :: Tell me more about the reasons`;
}

export function endangeredFish() {
    return `Jackpot!. You caught a $fishName. This is a rare breed and hard to find.
    Not edible and it’s illegal to keep. 
    We suggest you to contact the following organizations below.
    Might get potential rewards! $contactAgency`
}

export function contactAgency() {
    return `Endemic Species Research Institute
    (049)2761331
    
  Academia Sinica Biodiversity Research Center
    02-2789-9621
    
  NTU Institute of Oceanography
    886-2-23636040
  `;
}

export function waitForIdentification() {
    return `Received your image. Please wait a second until we identify your catch.`;
}