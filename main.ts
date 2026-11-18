import { PDFDocument } from 'pdf-lib';

const bearer = prompt('Bearer:');
const bookId = prompt('Book ID:');

interface BookDataMin {
	pagelabels: string[];
}
interface PageData {
	keypart: string;
	ivpart: string;
	page: string;
}

function parseBytes(csv: string, expectedLength: number, name: string): Uint8Array<ArrayBuffer> {
	const bytes = Uint8Array.from(csv.split(',').map((s) => Number.parseInt(s.trim(), 10)));
	if (bytes.length !== expectedLength || bytes.some((b) => !(b >= 0 && b <= 255))) {
		throw new Error(`${name} must be ${expectedLength} comma-separated bytes (0-255)`);
	}
	return bytes;
}
export async function decryptPage(data: PageData): Promise<Blob> {
	const key = await crypto.subtle.importKey(
		'raw',
		parseBytes(data.keypart, 32, 'keypart'),
		'AES-CBC',
		false,
		['decrypt'],
	);
	const iv = parseBytes(data.ivpart, 16, 'ivpart');
	const ciphertext = Uint8Array.from(atob(data.page), (c) => c.charCodeAt(0));
	const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ciphertext);
	return new Blob([plain], { type: 'application/pdf' });
}

async function mergePdfs(inputPaths: string[], outputPath: string) {
	const mergedPdf = await PDFDocument.create();
	for (const path of inputPaths) {
		const pdfBytes = await Bun.file(path).arrayBuffer();
		const pdf = await PDFDocument.load(pdfBytes);
		const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
		copiedPages.forEach((page) => mergedPdf.addPage(page));
	}

	const mergedPdfBytes = await mergedPdf.save();
	await Bun.write(outputPath, mergedPdfBytes);
}

const bookData = (await (
	await fetch(`https://reader.giappichelli.it/api/userproductsession/info/${bookId}/`, {
		headers: {
			accept: '*/*',
			authorization: `Bearer ${bearer}`,
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			pragma: 'no-cache',
		},
		body: null,
		method: 'GET',
		mode: 'cors',
		credentials: 'include',
	})
).json()) as BookDataMin;

for (const pageLabel of bookData.pagelabels) {
	const pageData = (
		(await (
			await fetch(
				`https://reader.giappichelli.it/api/userproductsession/pagepdf/${bookId}/${pageLabel}/`,
				{
					headers: {
						accept: '*/*',
						authorization: `Bearer ${bearer}`,
						'cache-control': 'no-cache',
						'content-type': 'application/json',
						pragma: 'no-cache',
					},
					// to skip the xor logic
					body: '{"keypart":"0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0","ivpart":"0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0"}',
					method: 'POST',
					mode: 'cors',
				},
			)
		).json()) as any
	).result as PageData;

	const decryptedPage = await decryptPage(pageData);

	Bun.write(`./out/${pageLabel}.pdf`, decryptedPage);
}

await mergePdfs(
	bookData.pagelabels.map((l) => `./out/${l}.pdf`),
	`./${bookId}.pdf`,
);
