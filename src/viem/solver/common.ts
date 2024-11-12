import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  maxConcurrent: 5, // Number of concurrent promises
  minTime: 1500, // Minimum time (in ms) between the start of subsequent promises
});
