import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  maxConcurrent: 3, // Number of concurrent promises
  minTime: 250, // Minimum time (in ms) between the start of subsequent promises
});
