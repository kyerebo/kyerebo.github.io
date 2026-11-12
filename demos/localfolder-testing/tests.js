function folderName(pfn) {
  if (!pfn) throw new Error('Enter the installed package family name before running checks.');
  return `microsoft_store_app_local_folder_${pfn}`;
}

async function names(directory) {
  const entries = [];
  for await (const [name] of directory.entries()) entries.push(name);
  return entries;
}

async function bounded(operation) {
  let timer;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new DOMException('OPFS check exceeded 15000ms', 'TimeoutError')), 15000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function inspectIsolation(pfn) {
  const name = folderName(pfn);
  const started = performance.now();
  return bounded(async () => {
    const root = await navigator.storage.getDirectory();
    const output = {
      origin: location.origin,
      topFrame: window === top,
      rootEntries: await names(root)
    };
    output.localFolderEntries = output.rootEntries.filter(entry => entry.startsWith('microsoft_store_app_local_folder_'));
    try {
      await root.getDirectoryHandle(name);
      output.directLookup = 'SUCCEEDED';
    } catch (error) {
      output.directLookup = 'REJECTED';
      output.directLookupError = error.name;
      output.directLookupMessage = error.message;
    }
    output.elapsedMs = Math.round(performance.now() - started);
    return output;
  });
}

export async function runPositive(pfn) {
  const name = folderName(pfn);
  const output = { timestamp: new Date().toISOString(), origin: location.origin, topFrame: window === top };
  await bounded(async () => {
    const root = await navigator.storage.getDirectory();
    output.rootEntries = await names(root);
    output.T1_entryListed = output.rootEntries.includes(name);
    const folder = await root.getDirectoryHandle(name);
    output.T2_getByName = !!folder;
    output.lfEntries = await names(folder);
    const file = await folder.getFileHandle('lf_test.txt');
    output.T3_readContent = await (await file.getFile()).text();
    let writable;
    try {
      writable = await file.createWritable();
      output.T4_writeBlocked = false;
    } catch (error) {
      output.T4_writeBlocked = true;
      output.T4_error = error.name;
      output.T4_message = error.message;
    }
    if (writable) await writable.abort();
    try {
      await folder.getFileHandle('new.txt', { create: true });
      output.T5_createBlocked = false;
    } catch (error) {
      output.T5_createBlocked = true;
      output.T5_error = error.name;
      output.T5_message = error.message;
    }
    await folder.removeEntry('lf_test.txt');
    output.T6_deleted = true;
  });
  return output;
}
