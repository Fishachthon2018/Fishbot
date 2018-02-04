interface FishInfo {
    name: string;
    fishLength: string;
    fishWeight: string;
    recommended: boolean;
    edible: boolean;
    endangered: boolean;
    commonName: string;
}

export async function getFish(imageUrl: string) : Promise<FishInfo> {
    let fish = fishes[i];
    i = (i + 1) % fishes.length;
    return fish;
}

export async function getFishInfo(fishName: string) {
    
}

export async function getFishByName(name: string) {
    name = name.toLowerCase();
    return fishes.find(row =>
            row.name.toLowerCase().indexOf(name) != -1);
}

let i=0;
const fishes: FishInfo[] = [
    {commonName: 'common fish', recommended: false, edible: false, endangered: true, name: 'Carangidae', fishLength: '0.5', fishWeight: '2'},
    {commonName: 'common fish', recommended: false, edible: true, endangered: false, name: 'Chanidae', fishLength: '0.5', fishWeight: '2'},
    {commonName: 'common fish', recommended: false, edible: false, endangered: true, name: 'Cichlids', fishLength: '0.5', fishWeight: '2'},
    {commonName: 'common fish', recommended: false, edible: true, endangered: false, name: 'Rachycentridae', fishLength: '0.5', fishWeight: '2'},
    {commonName: 'common fish', recommended: false, edible: false, endangered: true, name: 'Nemipteridae', fishLength: '0.5', fishWeight: '2'},
    {commonName: 'common fish', recommended: false, edible: true, endangered: false, name: 'Stromateidae', fishLength: '0.5', fishWeight: '2'},
    {commonName: 'common fish', recommended: false, edible: false, endangered: true, name: 'Serranidae', fishLength: '0.5', fishWeight: '2'}
]