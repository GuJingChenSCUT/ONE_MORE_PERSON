/** Preserve the entire requested history when an RPC provider imposes a smaller range limit. */
export async function getLogsBounded(client, request) {
  try { return await client.getLogs(request); }
  catch(error) {
    const rangeError=/block range too large/i.test(error.details??error.message??'');
    if(!rangeError||request.fromBlock>=request.toBlock) throw error;
    const middle=(request.fromBlock+request.toBlock)/2n;
    const left=await getLogsBounded(client,{...request,toBlock:middle});
    const right=await getLogsBounded(client,{...request,fromBlock:middle+1n});
    return [...left,...right];
  }
}
