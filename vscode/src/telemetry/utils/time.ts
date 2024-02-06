export const getCurrentUTCDateInSeconds = () => {
    const date = Date.now();
    return Math.floor(date/1000);
}

export const getOriginalDateFromSeconds = (seconds : number) => {
    return new Date(seconds*1000);
}