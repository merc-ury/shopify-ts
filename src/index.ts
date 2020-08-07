import Axios from 'axios';

async function getSource(uri: string): Promise<string> {
    return (await Axios.get(uri)).data as string;
}

getSource('http://www.google.com').then((value: string) => console.log(value));